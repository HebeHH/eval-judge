This is a nextjs app. It already has some endpoints available, which are described in `notes/INTERFACES.md`

We are going to start building the user interface and LLM interaction for the first part of the app. This acts as a chat with the user where an llm helps the user build up an eval prompt.

First we ask the user what their evaluation criteria is. They can select from a dropdown containing 'WITTY', 'INTELLIGENT', 'KIND'.

Then the user is engaged in a conversation about what that criteria means to them. 


## LLM Agents
There are three LLM agents involved in this:
1. Crticizer agent
2. Questioner agent
3. Eval generator

These agents are each associated with a `system` prompt, which you'll need to create accordingly. They are used through the `/prompt` api endpoint available, as described in `notes/INTERFACES.md`.

### Criticizer agent
The criticizer's job is to look at the existing conversation, and work out what information is still needed in order to produce a good evaluation prompt. It takes in the conversational history between the user and the questioner agent.  it doens't take in any previous criticizer agent prompts.

Write a very basic system prompt for this. We will improve it later. Please do make sure to structure the messages nicely though: Format it as a single user prompt with the user's conversational history in xml tags. 

### Questioner agent
The questioner is responsible for transforming the critical thoughts into actual questions for the user.It transforms the crticism into actionable questions, prioritizing the most important ones, and not overwhelming the user.

Write a very basic system prompt, we'll improve it later. Again, plese do make sure to structure the *messages* nicely as a single user prompt, including the user conversational history and then the most recent criticizer response in xml tags. At the end, ask something like "generate questions for the user based on <CRITICISM>" or the like.


### Eval generator agent(s)
We'll have three different eval generator agents.

Again, structure the conversation history as a single user message with xml tags, including only the user and questioner parts of the conversation. Use the same structure for all 3 eval generator agents. Add a prompt to generate an evaluation prompt at the end.

Then create 3 different system prompts for the 3 agents - again, these can be basic. The resultant Eval Prompts should ask for thoughts about where input data should be scored between 0-10 (structured output not required, we want thoughts, but thoughts on what score 0-10).



## UI Flow
After the user selects their evaluation criteria, always start off with a fixed default ask, which should start with `You want to create an evaluation for: ${criteria}` and then have fixed questions asking for more info (taking inspiration from `notes/EvalsGuide.md`).
The user responds to that. We now have the first two messages in the user's conversation history, and can begin the LLM loop. 

the user has a consistent textbox/send button UI.

### LLM loop
Once you've got a detailed agent reply:
1. call the criticizer agent and get criticism
2. call the questioner agent and STREAM THE QUESTION back to the user. 
3. once the questions have finished streaming, the user can send their next response.

Loop this 3 times. the number of times it loops should be a top-level easily-changed variable.

### Generate eval prompts
Once you've looped 3 times with the user, call each of the three eval generator agents and get 3 eval prompts back. Display these to the user side-by-side.



Come up for sensible prompts for the AI interaction described.
Put ALL prompts and partial prompts in src/constants/prompts.ts. Everywhere else, import the prompt and refer to it by variable name.