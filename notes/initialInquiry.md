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
The criticizer's job is to look at the existing conversation, and work out what information is still needed in order to produce a good evaluation prompt. It takes in the conversational history between the user and the questioner agent, although this should be modified so the criticizer doens't think it's part of the conversation. Format it as a single user prompt with the conversational history in xml tags instead. it doens't take in any previous criticizer agent prompts.

The criticizer agent should return a criticism of what's unclear, what's contradictory, and what additional info is crucial to build an eval prompt. It should be direct, thorough, and critical. It doesn't need to be nice, it's not talking directly to the user.
Read `notes/EvalsGuide.md` carefully to understand what a good eval should have. This document should inform the way the criticizer agent behaves. 

### Questioner agent
The questioner is responsible for transforming the critical thoughts into actual questions for the user.
It takes in the conversational history and the MOST RECENT criticizer response ONLY. Again, this needs to be formatted to make sure it matches the message structure openai requires (aka can't have two 'user' prompts in a row).

It transforms the crticism into actionable questions, prioritizing the most important ones, and not overwhelming the user. It can provide examples or suggestions. It's goal is to structure this in the way that's most likely to get the most important information from the user.

### Eval generator agent(s)
The eval generator(s) takes in the user's conversation and outputs an eval prompt. 

There should be 3 different eval generator agents available.take guidance on what an eval prompt looks like from `notes/EvalsGuide.md` and search the web. Use this guidance to create 3 different forms of eval generator system prompt. The way the conversational history is modified for the message can be the same between the 3 eval generator agents, and should NOT include the criticizer responses.

IMPORTANT NOTE: the eval prompts outputed need to:
* ask for a score 0-10
* ask for thoughts/reasoning, not structured output
* so basically they need to prompt a response that thinks and justifies what score 0-10 should be given for the testresponse, given the criteria as defined by the user in conversation


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