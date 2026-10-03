import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ text }: { text: string }) {
  const visible = text
    .replace(/```[a-zA-Z0-9_-]*[^\n]*artifact[\s\S]*?```/g, "\n\n_Opened in the artifact panel._\n\n")
    .replace(/<!--done:[\s\S]*?-->/g, "")
    .replace(/```tool[\s\S]*?```/g, "");
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{visible}</ReactMarkdown>
    </div>
  );
}
