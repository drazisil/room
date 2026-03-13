<div class="about-wrap">
  <div class="about-body">

    <h1>A City of Rooms</h1>
    <p class="subtitle">A vision document. Unfinished by design.</p>

    <h2>The Problem</h2>
    <p>The internet was built for correspondence between peers. It became a broadcast medium. Then it became a market. Along the way something was lost — the quiet, honest, personal presence of people who had things they cared about and put them somewhere.</p>
    <p>Social media inverted the relationship between person and thing. You became the product. Your identity became the content. Everything got optimized for attention, engagement, retention. The result is exhausting. People are withdrawing — not because they don't want connection, but because the available forms of connection cost too much.</p>
    <p>What's missing isn't another social network. It's a place to exist online without performing.</p>

    <h2>The Idea</h2>
    <p>A city of rooms.</p>
    <p>Each person has a room. It holds their things — links they saved, thoughts they had, projects they're working on, books they're reading, things they made. No required format. No template. Just a space that holds what they put in it.</p>
    <p>The room is theirs. It reflects them without being a performance of them. Like a study or a workshop — you didn't arrange it for visitors, but if a visitor comes they get a sense of you from being in it.</p>
    <p>The room has a door. Open or closed. Simple as that.</p>
    <p>The room has a guestbook. Someone passes through, leaves a note. Low commitment, low stakes. The door left slightly open.</p>
    <p>Rooms link to other rooms. Not algorithmically. By hand, deliberately, because the person whose room it is actually wandered through and liked what they found. Those links are a fingerprint. The shape of your links says almost as much as the room itself.</p>
    <p>Rooms cluster into webs. Like the old webrings — loose, self-selected, nobody owns the connections. A ring exists because the people in it decided it does. It can form and dissolve. The rooms persist regardless.</p>

    <h2>The Principles</h2>
    <dl>
      <dt>The thing is the value. Not you.</dt>
      <dd>You aren't the content. What you care about is the content. People find you by finding your things interesting. The room points to the person, not the other way around.</dd>

      <dt>Tended for yourself, visible if someone wanders past.</dt>
      <dd>The room exists because you wanted it to exist. Not for an audience. Discovery is a side effect, not the purpose. The garden tended for visitors feels like that. The one tended for its own sake feels like something else.</dd>

      <dt>Quiet coexistence, not engineered connection.</dt>
      <dd>Social happens as a byproduct of proximity around shared interest. A nod, a note, a slow correspondence if something develops. Nothing demanding a response right now. Social at a human scale — the kind that used to happen between neighbors, or pen pals, or people who kept finding each other at the same library shelf.</dd>

      <dt>Anonymous by default.</dt>
      <dd>The room is the identity. Not the name. Not the profile. You know whose room it is by being in it. A name is optional. A sign is your choice. You can be genuine without being findable.</dd>

      <dt>No hierarchy. No ranking.</dt>
      <dd>Rooms have addresses, not scores. Like plots in a city — the mansion and the bedsit are both just addresses. The street has no opinions about which matters more. No homepage. No featured rooms. No most visited. Just the web of addresses and the paths between them.</dd>

      <dt>Your stuff outlives the platform.</dt>
      <dd>If it evaporates when the company pivots, it was never really yours. Exportable. Backed up. Portable. The room is a URL. It goes anywhere, works on anything, can be archived, can be copied to your own machine. The canonical version is online but the stuff is yours.</dd>

      <dt>No metrics. None.</dt>
      <dd>No view counts. No follower numbers. No engagement rates. No read receipts. No online indicators. The audience is invisible to you. You are invisible to them unless someone chooses to say hello. This is not a bug.</dd>
    </dl>

    <h2>What Discovery Looks Like</h2>
    <p>You find a room. You like what's in it. You look at what rooms they link to. You find another room. You look at what's in that one.</p>
    <p>Each step is curated by a human whose taste you've already partially verified. No algorithm. Just — whose rooms do you link to, and what's in those rooms, and where do those links go.</p>
    <p>Curiosity moves through the web of rooms by following genuine interest. Slow. Unhurried. Self-directed.</p>
    <p>The follower list was almost this. But it degraded with scale and status. In a world of small quiet rooms the signal stays clean.</p>

    <h2>What It Is Not</h2>
    <p>Not a social network. Not a productivity tool. Not a publishing platform. Not a portfolio. Not a profile.</p>
    <p>Closer to a home. Online but yours. Quiet but not invisible. Honest because nobody's watching in a way that changes your behavior.</p>
    <p>The technology is almost embarrassingly simple. The hard part is the design — making it feel like a room and not a form. Making it easy enough that anyone can have one without knowing how to make a website. Making the culture protect the quietness.</p>
    <p>Small might have to be a feature, not a bug. Maybe it never scales. Maybe that's fine.</p>

    <p class="footer">Started: March 2026. Unfinished by design.</p>

    <div class="about-actions">
      <a href="/join">want your own room?</a>
    </div>

  </div>
</div>

<style>
  .about-wrap {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    display: flex;
    justify-content: center;
    padding: 4rem 2rem 6rem;
  }

  .about-body {
    max-width: 36rem;
    width: 100%;
  }

  h1 {
    font-size: 1.4rem;
    color: var(--ink);
    margin: 0 0 0.25rem;
  }

  .subtitle {
    font-size: 0.8rem;
    color: var(--faint);
    letter-spacing: 0.04em;
    margin: 0 0 3rem;
  }

  h2 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--faint);
    margin: 2.5rem 0 1rem;
  }

  p {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--ink);
    margin: 0 0 1rem;
  }

  dl {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin: 0;
  }

  dt {
    font-size: 0.9rem;
    color: var(--ink);
    margin-bottom: 0.25rem;
  }

  dd {
    font-size: 0.9rem;
    line-height: 1.7;
    color: var(--faint);
    margin: 0;
  }

  .footer {
    font-size: 0.8rem;
    color: var(--faint);
    margin-top: 3rem;
  }

  .about-actions {
    margin-top: 2rem;
  }

  .about-actions a {
    font-size: 0.85rem;
    color: var(--faint);
    text-decoration: none;
    letter-spacing: 0.06em;
  }

  .about-actions a:visited { color: var(--faint); }
  .about-actions a:hover { color: var(--ink); }
</style>
