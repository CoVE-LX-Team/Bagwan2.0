"""Shared content for Andrew’s web and print brief."""


def brief_body(*, printable=False):
    download = '' if printable else '<a href="what-changed.pdf" download>Download the one-page brief (PDF)</a>'
    return f'''<article class="brief">
  <header class="brief-head">
    <p class="eyebrow">For Andrew · Senior Learning Designer</p>
    <h1>What changed in Bagwan 3.0</h1>
    <p class="lead">Students work a reception shift in Bagwan. Alex wants an update on an interpreter booking, and the incoming receptionist needs a handover.</p>
  </header>
  <section aria-labelledby="brief-changes-title">
    <h2 id="brief-changes-title">Inside the intranet</h2>
    <dl class="brief-changes">
      <div><dt>Departments and people</dt><dd>Interpreting, Laboratory and Logistics open with the form staff need most. Each page links to the team, its reporting lines and its room in the tour.</dd></div>
      <div><dt>Forms and documents</dt><dd>Staff can search by name, filter by department, sort by last update and preview a file before downloading it. Clinical records open in their own online view.</dd></div>
      <div><dt>Videos and reference guides</dt><dd>The eleven HR meeting videos and the Closing the Gap video are available again. Allied health and liaison each have a staff guide.</dd></div>
    </dl>
  </section>
  <section class="brief-decision" aria-labelledby="brief-decision-title">
    <h2 id="brief-decision-title">Andrew’s review</h2>
    <p>Would a learner’s handover show the communication skills your unit expects? The guide includes Alex’s record and a sample note for the debrief.</p>
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
