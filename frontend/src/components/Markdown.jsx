import ReactMarkdown from "react-markdown";

/**
 * Renders markdown text with Tailwind prose-like styling.
 * Used for issue descriptions and comments.
 */
export default function Markdown({ children }) {
    if (!children) return null;
    return (
        <ReactMarkdown
            components={{
                h1: ({ children }) => <h1 className="text-lg font-bold text-slate-900 mt-3 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold text-slate-900 mt-3 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="text-sm text-slate-800 mb-2 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside text-sm text-slate-800 mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-slate-800 mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                code: ({ inline, children }) =>
                    inline
                        ? <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                        : <code className="block bg-slate-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto mb-2 whitespace-pre">{children}</code>,
                pre: ({ children }) => <pre className="mb-2">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="border-l-3 border-slate-300 pl-3 text-sm text-slate-600 italic mb-2">{children}</blockquote>,
                a: ({ href, children }) => <a href={href} className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">{children}</a>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                hr: () => <hr className="border-slate-200 my-3" />,
                table: ({ children }) => <table className="text-sm border-collapse border border-slate-200 mb-2 w-full">{children}</table>,
                th: ({ children }) => <th className="border border-slate-200 px-2 py-1 bg-slate-50 text-left text-xs font-semibold">{children}</th>,
                td: ({ children }) => <td className="border border-slate-200 px-2 py-1 text-xs">{children}</td>,
            }}
        >
            {children}
        </ReactMarkdown>
    );
}
