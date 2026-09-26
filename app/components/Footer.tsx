import Link from 'next/link';
import { Compass, MapPin, ShieldCheck, Sparkles, Github, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="app-footer home-footer">
      <div className="home-footer-main">
        <div className="home-footer-brand">
          <Link href="/" className="home-footer-logo"><Compass size={24} /> <span>TravelSetu</span></Link>
          <p>Travel smarter. Travel safer. Plan memorable journeys across India with AI-powered tools, maps, weather awareness and budget control.</p>
          <div className="home-footer-badges"><span><Sparkles size={13} /> AI planning</span><span><MapPin size={13} /> India focused</span><span><ShieldCheck size={13} /> Safety aware</span></div>
        </div>
        <div className="home-footer-col"><h3>Plan</h3><Link href="/plan-trip">Plan a trip</Link><Link href="/itinerary">My itinerary</Link><Link href="/my-trips">My trips</Link><Link href="/budget">Budget</Link></div>
        <div className="home-footer-col"><h3>Explore</h3><Link href="/explore">Destinations</Link><Link href="/nearby">Nearby places</Link><Link href="/trip-map">Trip map</Link><Link href="/marketplace">Stay & transport</Link></div>
        <div className="home-footer-col"><h3>TravelSetu</h3><Link href="/assistant">AI assistant</Link><Link href="/safety">Safety & SOS</Link><Link href="/about">About us</Link><Link href="/credits">Photo & data credits</Link></div>
        <div className="home-footer-col"><h3>Need help?</h3><p className="home-footer-note">Use the AI assistant for trip ideas, planning questions and quick travel guidance.</p><Link href="/assistant" className="home-footer-contact"><Mail size={15} /> Ask the assistant</Link><span className="home-footer-contact muted"><Github size={15} /> Demo project</span></div>
      </div>
      <div className="home-footer-bottom"><span>© {new Date().getFullYear()} TravelSetu. Built for smarter journeys.</span><div><span>AI-generated recommendations may need verification.</span><Link href="/credits">Credits & data sources</Link></div></div>
    </footer>
  );
}
