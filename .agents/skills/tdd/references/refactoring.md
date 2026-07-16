# Refactoring After Green

Only refactor while tests are green.

Look for:

- duplication introduced by the last cycle
- names that no longer match the behavior the tests describe
- validation or parsing logic that can be made structural
- overly shallow wrappers or pass-through helpers
- complexity that can move behind a smaller public interface
- missing edge/error coverage revealed by the implementation

After each meaningful refactor, rerun the targeted tests. Before handoff, run the validation gate
appropriate to the touched surface.
