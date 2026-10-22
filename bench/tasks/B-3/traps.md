# B-3 traps (never shown to the agent)

- **Line numbers:** physical line numbers must hold when a quoted field spans lines (FR-003).
- **Report everything:** all errors must be reported, and no output may be written on error.
- **Number edge cases:** `nan` and `inf` must be rejected, though `float()` accepts them. `1.5` is not an integer.
- **Full match:** a pattern must match the whole value (`re.fullmatch`), not just part of it.
- **BOM:** it must be stripped, or the first column name will not match.
- **Unicode output:** non-ASCII must be written unescaped (`ensure_ascii=False`).
