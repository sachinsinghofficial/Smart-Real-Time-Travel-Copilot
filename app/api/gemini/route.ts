import { BudgetExceededError, assertPlanBudget } from '@/lib/budget-policy';
import { ZodError } from 'zod';
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { tripSchema } from '@/lib/form-schemas';
import {
  acceptGeneratedPlan,
  itineraryPrompt,
  modelResponseSchema,
  completedDays,
  generatedDaySchema,
} from '@/lib/ai-itinerary';
import { getConditions } from '@/lib/conditions/providers';
import { adaptItinerary } from '@/lib/conditions/adapt';
import { getNearby, attachNearby } from '@/lib/nearby';
import { getErrorStatus, getGeminiModels } from '@/lib/gemini';
import { buildDemoItinerary } from '@/lib/itinerary';

export const runtime = 'nodejs';
export const maxDuration = 180;

const running = new Map<string, number>();

export function geminiErrorText(error: unknown, model: string) {
  const status = getErrorStatus(error);
  const raw = error instanceof Error ? error.message : String(error || '');
  const lower = raw.toLowerCase();

  if (status === 400 && /api[_ ]?key|key not valid/.test(lower)) {
    return 'Gemini rejected the API key. Check GEMINI_API_KEY and restart TravelSetu.';
  }
  if (status === 401 || status === 403) {
    return 'Gemini authentication failed. Check your Gemini API key and API access.';
  }
  if (status === 400 && /schema|generationconfig|response_json_schema|response_schema/.test(lower)) {
    return 'Gemini rejected the itinerary response format.';
  }
  if (status === 404 || /model.*(not found|not supported|not available)/.test(lower)) {
    return `Gemini model "${model}" is not available to this API key.`;
  }
  if (status === 429 || /quota|rate limit|resource exhausted/.test(lower)) {
    return 'Gemini quota or rate limit was reached.';
  }
  if (status && status >= 500) {
    return 'Gemini is temporarily unavailable.';
  }
  if (/fetch failed|network|enotfound|econn|tls|certificate/i.test(lower)) {
    return 'TravelSetu could not connect to Gemini.';
  }
  if (error instanceof ZodError) {
    return 'Gemini returned an itinerary with invalid details.';
  }
  if (error instanceof SyntaxError) {
    return 'Gemini returned an incomplete itinerary response.';
  }
  return 'Gemini could not complete the itinerary.';
}

export function isModelAccessError(error: unknown) {
  const status = getErrorStatus(error);
  const raw = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  return status === 404 || (status === 400 && /model|not found|not supported|not available/.test(raw));
}

function createFallback(trip: Parameters<typeof buildDemoItinerary>[0]) {
  return buildDemoItinerary(trip);
}

export async function POST(request: Request) {
  let trip: Parameters<typeof buildDemoItinerary>[0];

  try {
    const origin = request.headers.get('origin');
    if (
      origin &&
      origin !== new URL(request.url).origin &&
      origin !== process.env.GATEWAY_ALLOWED_ORIGIN
    ) {
      throw new Error('Request origin is not allowed.');
    }

    const raw = await request.text();
    if (raw.length > 16000) throw new Error('Trip details are too long.');

    trip = tripSchema.parse(JSON.parse(raw)?.trip);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check your trip details.' },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

  if ((running.get(ip) || 0) >= 2) {
    return NextResponse.json(
      { error: 'Two plans are already being generated. Wait for one to finish.' },
      { status: 429 }
    );
  }

  running.set(ip, (running.get(ip) || 0) + 1);

  const models = getGeminiModels();
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 165000);
  const cancel = () => abort.abort();

  request.signal.addEventListener('abort', cancel);

  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            )
          );
        } catch {
          closed = true;
          abort.abort();
        }
      };

      const heartbeat = setInterval(
        () => emit('ping', { time: Date.now() }),
        15000
      );

      try {
        /*
         * TravelSetu never depends exclusively on Gemini.
         * If no key exists, use the local planner immediately.
         */
        if (!process.env.GEMINI_API_KEY) {
          emit('status', {
            message: 'TravelSetu is preparing your itinerary…',
          });

          const fallback = createFallback(trip);

          emit('complete', {
            itinerary: fallback,
            source: 'fallback',
            model: 'travelsetu-local-planner',
            message: 'Generated by the TravelSetu local planning engine.',
          });

          return;
        }

        emit('status', {
          message: 'Gemini is planning your days…',
        });

        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { timeout: 150000 },
        });

        let lastError: unknown = null;
        let geminiCompleted = false;

        for (let i = 0; i < models.length; i += 1) {
          const model = models[i];
          let buffer = '';
          let sent = 0;

          try {
            if (i > 0) {
              emit('status', {
                message: `Trying ${model} because the previous Gemini model was unavailable…`,
              });
            }

            const response = await ai.models.generateContentStream({
              model,
              contents: itineraryPrompt(trip),
              config: {
                responseMimeType: 'application/json',
                responseJsonSchema: modelResponseSchema(),
                temperature: 0.35,
                maxOutputTokens: 50000,
                abortSignal: abort.signal,
              },
            });

            for await (const chunk of response) {
              if (abort.signal.aborted) {
                throw new Error('Generation cancelled or timed out.');
              }

              buffer += chunk.text || '';

              if (buffer.length > 600000) {
                throw new Error('Gemini output exceeded the plan size limit.');
              }

              const days = completedDays(buffer);

              for (; sent < days.length; sent += 1) {
                const day = generatedDaySchema.safeParse(days[sent]);

                if (day.success) {
                  emit('day', {
                    day: day.data.day,
                    title: day.data.title,
                    summary: day.data.summary,
                    activities: day.data.activities.map((activity) => ({
                      time: activity.time,
                      name: activity.name,
                      type: activity.type,
                    })),
                  });
                }
              }
            }

            if (!buffer.trim()) {
              throw new Error('Gemini returned an empty response.');
            }

            emit('status', {
              message: 'Checking your dates, timing and budget…',
            });

            let parsedPlan: unknown;

            try {
              parsedPlan = JSON.parse(buffer);
            } catch {
              const cleaned = buffer
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

              parsedPlan = JSON.parse(cleaned);
            }

            const seed = acceptGeneratedPlan(parsedPlan, trip, model);

            emit('status', {
              message: 'Checking weather and places near your route…',
            });

            const [conditions, nearby] = await Promise.all([
              getConditions(trip, seed),
              getNearby(seed, trip),
            ]);

            if (abort.signal.aborted) {
              throw new Error('Planning timed out. Please try again.');
            }

            const itinerary = attachNearby(
              adaptItinerary(seed, trip, conditions),
              nearby
            );

            assertPlanBudget(itinerary, trip);

            emit('complete', {
              itinerary,
              source: 'gemini',
              model,
              message:
                'Generated by Gemini. Locations, hours and prices need confirmation.',
            });

            geminiCompleted = true;
            return;
          } catch (error) {
            lastError = error;

            if (
              sent === 0 &&
              i < models.length - 1 &&
              isModelAccessError(error)
            ) {
              continue;
            }

            /*
             * A malformed response, 429, 503, validation failure,
             * timeout, or downstream failure should not kill TravelSetu.
             */
            break;
          }
        }

        if (!geminiCompleted) {
          console.warn(
            'Gemini generation failed; switching to TravelSetu local planner.',
            lastError
          );

          if (abort.signal.aborted) {
            throw new Error('Planning timed out or was cancelled.');
          }

          emit('status', {
            message:
              'Gemini is temporarily unavailable. TravelSetu is creating your itinerary…',
          });

          const fallback = createFallback(trip);

          /*
           * Check the local plan against the same budget policy.
           * If the demo planner cannot satisfy the budget, the user
           * gets the normal budget guidance instead of a fake success.
           */
          assertPlanBudget(fallback, trip);

          emit('complete', {
            itinerary: fallback,
            source: 'fallback',
            model: 'travelsetu-local-planner',
            message:
              'Generated by TravelSetu backup planner because Gemini was unavailable.',
          });

          return;
        }
      } catch (error) {
        if (error instanceof BudgetExceededError) {
          emit('error', {
            error: error.message,
            code: error.code,
            budget: error.budget,
            estimated: error.estimated,
            suggestedBudget: error.suggestedBudget,
          });
          return;
        }

        if (abort.signal.aborted) {
          emit('error', {
            error: 'Planning timed out or was cancelled. Please try again.',
          });
          return;
        }

        /*
         * Last-resort fallback. This catches errors outside the
         * normal Gemini loop as well.
         */
        try {
          emit('status', {
            message: 'TravelSetu is preparing a backup itinerary…',
          });

          const fallback = createFallback(trip);
          assertPlanBudget(fallback, trip);

          emit('complete', {
            itinerary: fallback,
            source: 'fallback',
            model: 'travelsetu-local-planner',
            message: 'Generated by TravelSetu backup planner.',
          });
        } catch (fallbackError) {
          console.error('TravelSetu fallback planner failed:', fallbackError);

          if (fallbackError instanceof BudgetExceededError) {
            emit('error', {
              error: fallbackError.message,
              code: fallbackError.code,
              budget: fallbackError.budget,
              estimated: fallbackError.estimated,
              suggestedBudget: fallbackError.suggestedBudget,
            });
          } else {
            emit('error', {
              error: geminiErrorText(
                error,
                models[0] || 'gemini-3.8-flash'
              ),
            });
          }
        }
      } finally {
        clearTimeout(timer);
        clearInterval(heartbeat);
        request.signal.removeEventListener('abort', cancel);

        const count = (running.get(ip) || 1) - 1;

        if (count > 0) {
          running.set(ip, count);
        } else {
          running.delete(ip);
        }

        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // Stream was already closed.
          }
        }
      }
    },

    cancel() {
      closed = true;
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
