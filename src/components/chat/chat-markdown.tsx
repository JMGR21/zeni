import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="[&:not(:first-child)]:mt-2">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mt-1.5 list-disc space-y-1 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mt-1.5 list-decimal space-y-1 pl-4">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-ki-awakening underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-ink-muted/15 px-1 py-0.5 font-mono text-[0.8em] text-ink">{children}</code>
  ),
  h1: ({ children }) => <p className="mt-2 font-display font-semibold text-ink">{children}</p>,
  h2: ({ children }) => <p className="mt-2 font-display font-semibold text-ink">{children}</p>,
  h3: ({ children }) => <p className="mt-2 font-display font-semibold text-ink">{children}</p>,
  hr: () => <hr className="my-2 border-ink-muted/15" />,
  blockquote: ({ children }) => (
    <blockquote className="mt-1.5 border-l-2 border-ink-muted/25 pl-2 text-ink-muted">{children}</blockquote>
  ),
};

/**
 * Las respuestas del asistente llegan en markdown (negritas, listas, etc.)
 * — este wrapper aplica los tokens de texto ya establecidos del proyecto en
 * vez de los estilos por defecto del navegador. Solo se usa para mensajes
 * del asistente; lo que escribe el usuario se muestra como texto plano.
 */
export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm text-ink [&>*:first-child]:mt-0">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
