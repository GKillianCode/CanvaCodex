// Serialize the visual editor to a restricted Markdown vocabulary, never stored HTML.
const escapeText = (value) => value.replace(/([\\`*_[\]<>])/g, "\\$1");
export function richMarkdown(root) {
  const codeBlocks = [],
    codePrefix = "\u0000" + crypto.randomUUID() + "\u0000";
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
        node.innerText ??
        node.textContent ??
        code?.innerText ??
        code?.textContent ??
        "";
      const fence = "`".repeat(
        Math.max(
          3,
          ...Array.from(value.matchAll(/`+/g), (m) => m[0].length + 1),
        ),
      );
      const fenced =
        fence + language + "\n" + value.replace(/\n$/, "") + "\n" + fence;
      const index = codeBlocks.push(fenced) - 1;
      return "\n\n" + codePrefix + index + "\u0000\n\n";
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
    if (/^h[1-6]$/.test(tag)) {
      const value = inside();
      return value.trim()
        ? "\n\n" + "#".repeat(Number(tag[1])) + " " + value + "\n\n"
        : "\n\n";
    }
    if (tag === "aside" && node.getAttribute("data-private-note")) {
      const body=inside().trim();
      const fence=":".repeat(Math.max(3,...Array.from(body.matchAll(/^(:{3,})/gm),match=>match[1].length+1)));
      return "\n\n"+fence+"comment\n"+body+"\n"+fence+"\n\n";
    }
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
      const lines=[];
      let index=Number(node.getAttribute?.('start'))||1,indent='  ';
      for(const child of Array.from(node.children||[])){
        const childTag=child.tagName?.toLowerCase();
        // Chromium indent can put a nested list directly inside its parent
        // list, or wrap it in an otherwise empty li. Neither is a new item.
        const onlyLists=childTag==='li'&&Array.from(child.children||[]).some(n=>['ul','ol'].includes(n.tagName?.toLowerCase()))&&Array.from(child.childNodes||[]).every(n=>n.nodeType===3?!n.textContent?.trim():['ul','ol'].includes(n.tagName?.toLowerCase()));
        if(childTag==='ul'||childTag==='ol'||onlyLists){
          const nested=(onlyLists?Array.from(child.children||[]).map(n=>inline(n)).join(''):inline(child)).trim();
          if(nested)lines.push((lines.length?'\n'+indent:'')+nested.replace(/\n/g,'\n'+(lines.length?indent:'')));
          continue;
        }
        const marker=tag==='ol'?`${index++}. `:'- ';
        indent=' '.repeat(marker.length);
        lines.push(marker+inline(child).trim().replace(/\n/g,'\n'+indent));
      }
      return '\n\n'+lines.join('\n')+'\n\n';
    }
    if (tag === "p" || tag === "div") return "\n\n" + inside() + "\n\n";
    return inside();
  }
  const source = Array.from(root.childNodes || [])
    .map((child) => inline(child))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return codeBlocks.reduce(
    (result, code, index) =>
      result.replaceAll(codePrefix + index + "\u0000", code),
    source,
  );
}
