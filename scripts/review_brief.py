"""Shared content for Andrew’s web and print brief."""


def brief_body(*, printable=False):
    download = '' if printable else '<a href="what-changed.pdf" download>Download the one-page brief (PDF)</a>'
    return f'''<article class="brief">
  <header class="brief-head">
    <p class="eyebrow">For Andrew · Senior Learning Designer</p>
    <h1>What changed in Bagwan 3.0</h1>
    <p class="lead">Students can use Bagwan as a staff intranet. The learning guide gives them a workplace request to follow, with a handover to write and discuss.</p>
  </header>
  <section aria-labelledby="brief-changes-title">
    <h2 id="brief-changes-title">Inside the intranet</h2>
    <dl class="brief-changes">
      <div><dt>People</dt><dd>Staff profiles show the person’s role, department, manager and direct reports where these are known.</dd></div>
      <div><dt>Documents</dt><dd>Staff can filter documents by category, preview a policy or form, and download the edition they see.</dd></div>
      <div><dt>Videos and reference guides</dt><dd>The eleven HR meeting videos and the Closing the Gap video are available again. Allied health and liaison each have a staff guide.</dd></div>
    </dl>
  </section>
  <section class="brief-decision" aria-labelledby="brief-decision-title">
    <h2 id="brief-decision-title">Andrew’s review</h2>
    <p>Take the reception role and open Alex Morgan’s record. Would the two-sentence handover and follow-up question give you the evidence you need for your unit?</p>
    <div class="brief-links">
      <a href="learning-guide.html#visit">Try the reception task</a>
      <a href="review-register.html#learning-review">Open the review register</a>
    </div>
  </section>
  <footer class="brief-links">
    <a href="./">Explore Bagwan 3.0</a>
    <a href="../index.html">Compare Bagwan 2.0</a>
    {download}
  </footer>
</article>'''
