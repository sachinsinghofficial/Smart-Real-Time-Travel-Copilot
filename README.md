# 🌍 TRAVEL AI — Autonomous Travel Optimization & Execution Engine

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in/)
[![Theme](https://img.shields.io/badge/Category-Travel%20%26%20Tourism-blue.svg)](#)
[![Status](https://img.shields.io/badge/Build-Active%20MVP-success.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Tagline:** *Plan More. Spend Less. Travel Safer. Adapt Automatically.*  
> **Team:** Code Bytes (Prashant Sharma, Sachin Singh, Jatin Pal)

---

## 📌 Overview

**TRAVEL AI** is an autonomous, state-aware travel operating system designed to shift trip planning from static web searches into a continuous execution engine.

Most conventional planning tools leave travelers stuck juggling 8+ disconnected tabs (*Maps, Weather, Booking engines, Review blogs, Food apps, Notes*), resulting in decision fatigue and roadside panic when disruptions occur. TRAVEL AI eliminates this friction by managing the complete travel lifecycle: enforcing deterministic mathematical budget ceilings, monitoring ground conditions in real time, and auto-healing itineraries in one tap when weather, roadblocks, or venue closures strike.

---

## 🚀 Key Features

### 1. 💰 Deterministic Budget Optimizer
* **Math Over Hallucinations:** Implements a backend constraint-solver algorithm (Knapsack logic) guaranteeing:
  $$\text{Total Cost} \le \text{User Budget}$$
* **Tiered Allocations:** Dynamically distributes funds across transit, lodging, food, and activities while keeping a mandatory **10–15% Emergency Reserve**.
* **Three Plan Modes:** Instant generation and comparison between **Budget**, **Comfort**, and **Luxury** tiers.

### 2. ⚡ Real-Time "Auto-Healing" Autopilot
* Continuous background monitoring of weather alerts (IMD nowcasts), road bottlenecks, and temporary venue closures.
* **1-Tap Recovery:** When a route is blocked or an outdoor attraction shuts down due to rain, the engine drops the unreachable node, identifies nearby open alternatives within budget, and restructures downstream plans instantly.

### 3. 🛡️ Data Confidence Badging System
Eliminates LLM hallucination and restores traveler trust using explicit provenance badges:
* 🟢 **Official / Verified (Tier 1):** Sourced from ASI, State Tourism Boards, or IMD.
* 🔵 **Verified API (Tier 2):** Live transit & booking partner feeds.
* 🟡 **Community Reported (Tier 3):** Ground alerts confirmed by multiple nearby travelers.
* ⚪ **Unverified:** Clearly flagged for user caution.

### 4. 🍛 Hyper-Local & Authentic Regional Culture
* Hard-filters dietary constraints (Pure Veg, Jain, No-Onion/Garlic, Vegan).
* Prioritizes authentic regional cuisine, local homestays, and district artisans, de-congesting hyper-commercialized tourist traps.

### 5. 🆘 Offline-Ready SOS Dashboard
* Displays one-tap real-time GPS coordinates, nearest verified district medical facilities, and police outposts.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND PRESENTATION                           │
│     React 18 + TypeScript + Vite + Tailwind CSS + Mapbox/Leaflet GL    │
│       [Dynamic Budget Slider] [Live Trip Dashboard] [1-Tap SOS]        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / REST / WebSockets
┌──────────────────────────────────▼─────────────────────────────────────┐
│                           BACKEND GATEWAY                              │
│              Node.js / Express / Fastify (Role-Based JWT)              │
│       Roles: Tourist | Local Business | Admin | Tourism Authority      │
└──────────┬───────────────────────┬──────────────────────────┬──────────┘
           │                       │                          │
┌──────────▼──────────┐ ┌──────────▼──────────┐    ┌──────────▼──────────┐
│ DETERMINISTIC ENGINE│ │ DATA CONFIDENCE &   │    │ REASONING & NLP     │
│ • Knapsack Budget   │ │ PROVENANCE LAYER    │    │ • LLM Personalizer  │
│   Solver            │ │ 🟢 Official (Gov)   │    │ • Natural Language  │
│ • Graph Routing     │ │ 🔵 Verified (APIs)  │    │   Replanning Copilot│
│   Optimization      │ │ 🟡 Community Alert  │    │ • Review Sentiment  │
│ • Expense Ledger    │ │ ⚪ Unverified       │    │   Analysis Engine   │
└──────────┬───────────┘ └──────────┬───────────┘    └──────────┬──────────┘
           │                        │                           │
┌──────────▼────────────────────────▼───────────────────────────▼────────┐
│                   POSTGRESQL + POSTGIS / MONGODB                       │
│    Normalized Entities: Trips, Verified Places, Live Reports, Telemetry│
└────────────────────────────────────────────────────────────────────────┘
