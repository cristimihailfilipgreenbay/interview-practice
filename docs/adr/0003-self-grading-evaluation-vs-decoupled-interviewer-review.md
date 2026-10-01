# Candidate evaluation self-grades; Interviewer Performance Review uses a decoupled judge instead

STAR evaluation of the candidate (verdict, reasoning, improvement suggestions) runs on
`gpt-5-mini` — the same model that conducted the interview — despite the self-grading bias
risk that would normally argue for a decoupled judge. This reverses an earlier design that
did decouple them. Model diversity for judging is provided elsewhere instead: the separate
Interviewer Performance Review grades the AI interviewer's own conduct on an independent,
user-selectable judge model. That's a genuinely different kind of judgment — the app's own
prompt/model quality, not the candidate — and is also what satisfies the assignment's
"LLM-as-a-judge" optional task, which the candidate-facing evaluation doesn't.
