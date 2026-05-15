/**
 * Transforms Svelte 5 runes ($state, $derived, $effect) in .svelte.ts files
 * for test environments where the Svelte compiler isn't available.
 * $state(x) → x, $derived(x) → x, $effect(x) → () => {}.
 * Handles nested parentheses correctly.
 */
export function svelteRunesPlugin() {
  return {
    name: "svelte-runes-transform",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".svelte.ts")) return;

      const runeRe = /\$((?:state|derived|effect))\s*\(/g;
      let result = code;
      let match;

      while ((match = runeRe.exec(result)) !== null) {
        const start = match.index;
        const afterParen = match.index + match[0].length;
        let depth = 1;
        let i = afterParen;
        while (i < result.length && depth > 0) {
          if (result[i] === "(") depth++;
          else if (result[i] === ")") depth--;
          i++;
        }
        const innerExpr = result.slice(afterParen, i - 1);
        result = result.slice(0, start) + innerExpr + result.slice(i);
        runeRe.lastIndex = start + innerExpr.length;
      }

      return { code: result, map: null };
    },
  };
}
