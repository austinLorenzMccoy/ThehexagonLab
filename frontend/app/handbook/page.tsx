import fs from 'fs'
import path from 'path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

export const metadata = {
  title: 'Handbook | Hexagon LABS',
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-foreground mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 mb-4 text-xl font-bold text-foreground border-t border-border-subtle pt-8 first:mt-0 first:border-0 first:pt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-2 text-base font-semibold text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-5 mb-2 text-sm font-semibold text-foreground">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} className="text-ops underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  hr: () => <hr className="my-10 border-border-subtle" />,
  blockquote: ({ children }) => (
    <div className="mb-4 rounded-lg border border-border-subtle border-l-4 border-l-ops bg-card px-4 py-3 text-sm text-muted-foreground [&>p]:mb-0">
      {children}
    </div>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border-subtle px-3 py-2 align-top text-muted-foreground">
      {children}
    </td>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  ),
}

export default function HandbookPage() {
  const filePath = path.join(process.cwd(), 'public', 'handbook.md')
  const markdown = fs.readFileSync(filePath, 'utf-8')

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
