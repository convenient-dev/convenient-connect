import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agreement",
};

// TODO: Replace this placeholder lorem-ipsum content with the real agreement
// copy (or load it from a CMS / database so non-engineers can edit it without
// a code change).
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Introduction",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla.",
  },
  {
    heading: "2. Services",
    body: "Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor.",
  },
  {
    heading: "3. Fees & Payments",
    body: "Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.",
  },
  {
    heading: "4. User Conduct",
    body: "Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit.",
  },
  {
    heading: "5. Privacy",
    body: "Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor.",
  },
  {
    heading: "6. Termination",
    body: "Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper.",
  },
  {
    heading: "7. Limitation of Liability",
    body: "Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede.",
  },
  {
    heading: "8. Changes to this Agreement",
    body: "Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet.",
  },
];

export default function AgreementPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 24px 64px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#111",
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px" }}>
        Agreement
      </h1>
      <p style={{ color: "#666", fontSize: 13, margin: "0 0 32px" }}>
        Last updated: January 1, 2026 · Please read this agreement carefully
        before continuing.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.heading} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
            {section.heading}
          </h2>
          <p style={{ fontSize: 15, margin: 0 }}>{section.body}</p>
        </section>
      ))}
    </main>
  );
}
