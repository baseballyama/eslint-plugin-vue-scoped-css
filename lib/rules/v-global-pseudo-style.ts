import type { ValidStyleContext } from "../styles/context";
import {
  getStyleContexts,
  getCommentDirectivesReporter,
  isValidStyleContext,
} from "../styles/context";
import type { RuleContext, RuleListener } from "../types";
import type { VGlobalPseudo } from "../styles/utils/selectors";
import {
  isVGlobalPseudo,
  isPseudoEmptyArguments,
} from "../styles/utils/selectors";

export = {
  meta: {
    docs: {
      description: "enforce `:global()`/`::v-global()` style",
      categories: [
        // TODO: enable in next major version
        // "vue3-recommended"
      ],
      default: "warn",
      url: "https://future-architect.github.io/eslint-plugin-vue-scoped-css/rules/v-global-pseudo-style.html",
    },
    fixable: "code",
    messages: {
      expectedGlobal: "Expected ':global()' instead of '::v-global()'.",
      expectedVGlobal: "Expected '::v-global()' instead of ':global()'.",
    },
    schema: [{ enum: [":global", "::v-global"] }],
    type: "suggestion",
  },
  create(context: RuleContext): RuleListener {
    const styles = getStyleContexts(context)
      .filter(isValidStyleContext)
      .filter((style) => style.scoped);
    if (!styles.length) {
      return {};
    }
    const expected = (context.options[0] || ":global") as
      | ":global"
      | "::v-global";
    const reporter = getCommentDirectivesReporter(context);

    /**
     * Reports the given node
     * @param {ASTNode} node node to report
     */
    function report(node: VGlobalPseudo) {
      reporter.report({
        node,
        loc: node.loc,
        messageId:
          expected === ":global" ? "expectedGlobal" : "expectedVGlobal",
        fix(fixer) {
          const nodeText = context.getSourceCode().text.slice(...node.range);
          return fixer.replaceTextRange(
            node.range,
            nodeText.replace(
              /^(\s*)(?::global|::v-global)(\s*\()/u,
              (_, prefix: string, suffix: string) =>
                `${prefix}${expected}${suffix}`
            )
          );
        },
      });
    }

    /**
     * Verify the node
     */
    function verifyNode(node: VGlobalPseudo) {
      if (node.value === expected) {
        return;
      }

      report(node);
    }

    /**
     * Verify the style
     */
    function verify(style: ValidStyleContext) {
      style.traverseSelectorNodes({
        enterNode(node) {
          if (isVGlobalPseudo(node) && !isPseudoEmptyArguments(node)) {
            verifyNode(node);
          }
        },
      });
    }

    return {
      "Program:exit"() {
        for (const style of styles) {
          verify(style);
        }
      },
    };
  },
};
