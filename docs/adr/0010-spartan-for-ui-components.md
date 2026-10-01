# Spartan (+ Tailwind) for UI components, over Angular Material or PrimeNG

The Angular client uses [Spartan](https://spartan.ng) — headless primitives (Brain) plus
styled components you copy into the repo and own (Helm), the shadcn/ui model applied to
Angular, built on Angular CDK. Chosen over Angular Material (heavier Material Design
opinions, harder to reskin into this project's own identity) and PrimeNG (large bundle,
also visually opinionated) because this product wants a distinctive look, not a generic
admin-dashboard one, and because owning the component source beats fighting a library's
internals later. Pulls in Tailwind CSS as a new dependency — the client currently styles
components with plain SCSS — since Spartan's styled layer expects it. Hard to reverse
(swapping UI libraries later means redoing every component), which is why this is recorded
rather than left as an implicit choice.
