// Signed-out home page. Rendered by app/page.tsx when there's no session;
// signed-in visitors (and NFC taps) get the checklist at the same URL.

import Link from 'next/link'
import Ticket from '@/components/ticket/Ticket'
import { walk } from '@/lib/routine/walk'
import { summarizeWeather } from '@/lib/weather'
import DoorDrawing from './DoorDrawing'
import HeroTicket from './HeroTicket'
import RoutineDemo from './RoutineDemo'
import { CHECK_NO, DEMO_GRAPH, FRIDAY, RAINY } from './demo'
import './landing.css'

const SETUP = [
  'Get an NFC sticker. NTAG213 is plenty.',
  'Write your gtfotd link to it with any NFC app.',
  'Stick it by the door at hand height.',
]

const SMALL_PRINT: [string, string][] = [
  ['Phone, laptop', 'The ticket is made for your phone. The builder wants a laptop; flowcharts need room.'],
  ['Weather', 'From Open-Meteo, for wherever your phone says you are, or a town you type in.'],
  ['Trains', 'Live from the MTA, so New York only for now. Pick your stop and lines and the ticket says when to leave.'],
  ['Resets', 'A fresh check prints each morning, or as soon as you tap Done.'],
  ['Routines', 'Keep a few (weekdays, travel, the week you’re dog-sitting) and pick which one is live.'],
  ['Email', 'Only for signing in. gtfotd doesn’t send email, not even a confirmation.'],
]

export default function Landing() {
  const finished = walk(
    DEMO_GRAPH,
    { weather: RAINY, weekday: FRIDAY.weekday },
    { gym: true }
  ).items.map((item) => ({ ...item, checked: true }))

  return (
    <div className="lp">
      <header className="lp-wrap lp-mast">
        <div className="lp-brand">
          <span className="lp-wordmark">gtfotd</span>
          <span className="lp-flourish">get the *heck out the door</span>
        </div>
        <nav className="lp-nav">
          <Link className="lp-textlink" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-outline lp-btn lp-mast-cta" href="/signup">
            Start a routine
          </Link>
        </nav>
      </header>

      <main>
        <section className="lp-wrap lp-hero">
          <div className="lp-hero-copy">
            <h1 className="lp-headline">
              Umbrella if it rains.
              <br />
              Gym bag on Tuesdays.
              <br />
              Keys, always.
            </h1>
            <p className="lp-lede">
              gtfotd is a checklist you open by tapping your phone on the door frame. You draw
              your mornings once, as a flowchart. After that, every tap prints today’s list,
              worked out from the forecast, the day of the week, and anything it needs to ask
              you.
            </p>
            <div className="lp-ctas">
              <Link className="btn lp-btn" href="/signup">
                Start a routine
              </Link>
              <Link className="btn btn-outline lp-btn" href="/login">
                Sign in
              </Link>
            </div>
            <p className="lp-note">Runs in your phone’s browser. Nothing to install.</p>
          </div>
          <HeroTicket />
        </section>

        <section className="lp-wrap lp-section">
          <div className="lp-section-inner">
            <div className="lp-demo-intro">
              <div className="lp-demo-intro-copy">
                <h2 className="lp-h2">Where the list comes from</h2>
                <p className="lp-section-lede">
                  You draw your routine once, on a laptop. Weather, day and ask steps each split
                  into YES and NO. Items hang off the ends of the branches, and whichever ones a
                  morning reaches print as rows on that day’s ticket.
                </p>
              </div>
              <div className="lp-demo-hint">
                <p>
                  Try a different morning. Flip the weather or the day, answer the question,
                  tick things off.
                </p>
                <span className="lp-demo-hint-lead" aria-hidden />
              </div>
            </div>
            <RoutineDemo />
          </div>
        </section>

        <section className="lp-wrap lp-section">
          <div className="lp-section-inner lp-door">
            <h2 className="lp-h2 lp-door-head">Stick it by the door</h2>
            <div className="lp-door-sheet">
              <div className="lp-sheet">
                <DoorDrawing />
                <DoorDrawing compact />
              </div>
            </div>
            <div className="lp-door-body">
              <p className="lp-section-lede">
                An NFC sticker is about the size of a postage stamp and holds a single link. Put
                one on the wall by the door, where your hand already goes on the way out, and
                write your gtfotd link to it. From then on, tapping it with your phone opens
                today’s check. There’s no app to install. No sticker? A home-screen bookmark does
                the same job, minus the little ritual.
              </p>
              <ul className="lp-setup">
                {SETUP.map((step) => (
                  <li key={step}>
                    <span className="gc-box" aria-hidden />
                    <span>{step}</span>
                    <span className="lp-setup-tag">Once</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-wrap lp-section">
          <div className="lp-section-inner">
            <h2 className="lp-h2">The small print</h2>
            <dl className="lp-fine">
              {SMALL_PRINT.map(([term, detail]) => (
                <div className="lp-fine-row" key={term}>
                  <dt>{term}</dt>
                  <dd>{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="lp-wrap lp-section lp-section-last">
          <div className="lp-section-inner lp-close">
            <div className="lp-close-copy">
              <h2 className="lp-close-h">
                Set it up tonight.
                <br />
                Try it tomorrow morning.
              </h2>
              <p className="lp-lede">
                Make an account, draw a routine on your laptop, and write the link to a sticker.
                Tomorrow, tap it on your way out.
              </p>
              <p className="lp-note">
                Already have one? <Link href="/login">Sign in</Link>
              </p>
            </div>
            <div className="lp-close-ticket">
              <Ticket
                dateLabel={FRIDAY.dateLabel}
                weatherLabel={summarizeWeather(RAINY)}
                checkNo={CHECK_NO}
                items={finished}
                allSet
                minRows={5}
                footer={
                  <Link className="btn" href="/signup">
                    Start a routine
                  </Link>
                }
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-wrap lp-foot">
        <div className="lp-foot-inner">
          <div>
            <div className="lp-brand">
              <span className="lp-wordmark">gtfotd</span>
              <span className="lp-flourish">get the *heck out the door</span>
            </div>
            <p className="lp-footnote">* Or whatever word you use at 7:52 a.m.</p>
          </div>
          <p className="lp-credit">
            Weather data by <a href="https://open-meteo.com/">Open-Meteo.com</a> (CC BY 4.0).
            <br />
            Train times from MTA open data.
          </p>
        </div>
      </footer>
    </div>
  )
}
