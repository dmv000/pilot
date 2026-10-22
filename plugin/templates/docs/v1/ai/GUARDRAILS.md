# Guardrails and safety limits

Purpose: what the AI must never do or discuss, and how each limit is enforced and tested.
Read this when: you change prompts, tools or filters, or review an AI feature.
Related files: docs/ai/evals/RUBRIC.md, docs/quality/SECURITY.md

Status: Draft

Standards: OWASP Top 10 for LLM Applications; NIST AI RMF (Govern, Map, Measure, Manage).

## Forbidden

| Limit | OWASP LLM risk | Enforced by | Eval cases |
| --- | --- | --- | --- |
| {{limit}} | {{LLM01 prompt injection ...}} | {{filter or code}} | {{case ids}} |

## Escalation to a human

{{when and how}}
