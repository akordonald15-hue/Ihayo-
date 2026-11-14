# Farmer UX audit — before implementation

Audited the live first-time Kajuru journey on 14 November 2026: state, LGA, maize history, priority, all six field questions, review, live advice, and evidence access. Generated advice, warnings, charts and scenario controls were present.

1. High: a supported LGA still requires Continue; device location adds a second confirmation. Advance only after fresh API readiness validation, announce the selected area briefly, and retain explicit consent for nearby records. Back must not restart automatic navigation.
2. High: eleven soil/rainfall paragraphs precede crop choices. Put the crop task first and retain every scientific paragraph below the controls, visible rather than collapsed.
3. Medium: field questions give no count within their six-question sequence; mobile progress is mostly graphical. Add explicit stage and question counts.
4. Medium: generic location errors do not explain denied permission versus timeout. Give a practical recovery action for each, without changing API errors or agricultural statements.
5. Medium: the landing explains process and evidence but leaves the farming problem and supported example implicit. Add a concise problem/solution introduction, identify farmers and extension workers, and explain a labelled Kajuru example without invented recommendations.
6. Low: abstract loading and final action copy can be clearer. Use direct frontend-owned labels. Preserve server question wording and advice verbatim.

Reference: https://spacegenes-plus.framer.website/ (desktop and mobile review). Useful principles: explain the problem before process, identify the audience, show a short input-to-result sequence, distinguish working capabilities from examples, and place sources near claims. Ihayo will retain its own photographic scenes, palette, typography and composition. The reference mobile page also leaves large gaps; those are not a pattern to adopt.
