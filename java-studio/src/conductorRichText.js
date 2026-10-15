// Serialize the visual editor to a restricted Markdown vocabulary, never stored HTML.
const escapeText = (value) => value.replace(/([\\`*_[\]<>])/g, "\\$1");
export function richMarkdown(root) {
  function inline(node, color = null) {
    if (node.nodeType === 3) {
      const value = escapeText(node.textContent || "");
      return color
        ? value
            .split("\n")
            .map((line) => (line ? "==" + color + "|" + line + "==" : ""))
            .join("\n")
        : value;
    }
    const tag = node.tagName?.toLowerCase(),
      inside = () =>
        Array.from(node.childNodes || [])
          .map((child) => inline(child, color))
          .join("");
    if (tag === "br") return "\n";
    if (tag === "img") {
      const id = node.getAttribute("data-frame-image");
      return id
        ? "\n\n![" +
            (node.getAttribute("alt") || "").replace(/[\[\]\n]/g, "") +
            "](frame-image:" +
            id +
            ")\n\n"
        : "";
    }
    if (tag === "pre") {
      const code = node.querySelector("code"),
        language = code?.className?.match(/language-([\w-]+)/)?.[1] || "";
      const value =
        (code || node).innerText ?? (code || node).textContent ?? "";
      const fence = "`".repeat(
        Math.max(
          3,
          ...Array.from(value.matchAll(/`+/g), (m) => m[0].length + 1),
        ),
      );
      return (
        "\n\n" +
        fence +
        language +
        "\n" +
        value.replace(/\n$/, "") +
        "\n" +
        fence +
        "\n\n"
      );
    }
    if (tag === "code")
      return "`" + (node.textContent || "").replace(/`/g, "\\`") + "`";
    if (["strong", "b"].includes(tag)) return "**" + inside() + "**";
    if (["em", "i"].includes(tag)) return "*" + inside() + "*";
    if (["s", "strike", "del"].includes(tag)) return "~~" + inside() + "~~";
    if (tag === "mark") {
      const shade = node.getAttribute("data-highlight") || "yellow";
      return Array.from(node.childNodes || [])
        .map((child) => inline(child, shade))
        .join("");
    }
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      return /^(https?:|mailto:|#)/i.test(href)
        ? "[" +
            inside() +
            "](" +
            href.replace(/[\s()]/g, (c) => encodeURIComponent(c)) +
            ")"
        : inside();
    }
    if (/^h[1-6]$/.test(tag))
      return "\n\n" + "#".repeat(Number(tag[1])) + " " + inside() + "\n\n";
    if (tag === "blockquote")
      return (
        "\n\n" +
        inside()
          .trim()
          .split("\n")
          .map((line) => "> " + line)
          .join("\n") +
        "\n\n"
      );
    if (tag === "hr") return "\n\n---\n\n";
    if (tag === "table") {
      const rows = Array.from(node.querySelectorAll("tr")).map((row) =>
        Array.from(row.children).map((cell) =>
          inline(cell).trim().replace(/\|/g, "\\|").replace(/\n/g, " "),
        ),
      );
      if (!rows.length) return "";
      return (
        "\n\n| " +
        rows[0].join(" | ") +
        " |\n| " +
        rows[0].map(() => "---").join(" | ") +
        " |\n" +
        rows
          .slice(1)
          .map((row) => "| " + row.join(" | ") + " |")
          .join("\n") +
        "\n\n"
      );
    }
    if (tag === "ul" || tag === "ol") {
      return (
        "\n\n" +
        Array.from(node.children || [])
          .map(
            (li, i) =>
              (tag === "ol" ? i + 1 + ". " : "- ") +
              inline(li).trim().replace(/\n/g, "\n  "),
          )
          .join("\n") +
        "\n\n"
      );
    }
    if (tag === "p" || tag === "div") return "\n\n" + inside() + "\n\n";
    return inside();
  }
  return Array.from(root.childNodes || [])
    .map((child) => inline(child))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
