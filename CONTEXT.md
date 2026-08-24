# Crispy Code

Local code search and Ask: a signed-in user questions their own folders and gets answers grounded in matches from those folders.

## Language

**AskThread**:
A conversation in which a user asks about their local code.
_Avoid_: chat, session, conversation (as the entity name)

**AskTurn**:
One Question from the user together with the assistant’s response to it (Answer, Search Progress, and Evidence).
_Avoid_: message, AskMessage, chat message

**Question**:
The user’s prompt on an AskTurn.

**Answer**:
The assistant’s prose reply on an AskTurn. It is part of the durable turn and may grow before the turn is complete.

**Thinking**:
The model’s reasoning text produced while generating an Answer. It is not part of the durable turn; it exists only for the current viewing session.
_Avoid_: thought process, chain of thought, reasoning (as the entity name)

**Search Progress**:
The retrieval work for an AskTurn, shown as stages (planning, searching, writing) plus the planned searches. Distinct from Thinking and from Evidence.
_Avoid_: thought process, thinking (for retrieval steps)

**Evidence**:
The code matches used to write an Answer.
_Avoid_: hits, snippets (as the entity name)
