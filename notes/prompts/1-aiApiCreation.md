

Create API endpoints within this nextjs app to make llm processing available.

Use openai with `gpt-4.1-mini`. OPENAI_API_KEY will be an env variable.

We need the following LLM functions:

```
function promptGeneric(
    system: string,
    messages: {
        role: string,
        content: string,
    } // proper openai type
) : string


function scorer(
    reasoning: string
) : number
```

`promptGeneric` calls the openai api normally using the input information.

`scorer` calls the openai api with:
*  fixed system prompt `score_prompt` which commands the llm to return a score between 1 and 10
* input messages [{role: "user", content: reasoning}]
* `text: { format: zodTextFormat(z.object({score: z.number().min(0).max(0)}))}`

Basically the `thoughts` will be another llm's reasoning about what score to give, and `scorer` just makes sure we're returning a valid score based on that. 


These 2 function support the following API calls:
```
/prompt
input: { 
    system: string,
    messages: {
        role: string,
        content: string,
    }
}
output: {
    response: string
}

/batchScore
input: {
    judgingMatrix: string,
    tests: {id: number, text: string}[]
}
output: {
    results: {
        id: number,
        score: number
    }[]
}
```
/prompt directly maps to promptGeneric. 

/batchScore is more complicated:
```pseudocode
results = []
judgementPrompt = formJudgementPrompt(judgingMatrix)
for test in tests:
    testPrompt = formatTest(test)
    reasoning = promptGeneric(judgementPrompt, {"user": testPrompt})
    score = scorer(reasoning)
    results.append(
        id: test.id,
        score: score
    )
return results
```
IMPORTANT when the UI calls /batchScore, it will need continuous feedback of how far it is through the process. The UI will want to show a progress bar.



Task: create the functions and api endpoints described here. create ALL functions and prompts needed for this to work. Be sensible and thoughtful where you need to design prompts.


UI Test/demo:
additionally create and add two components to the UI to test this.

Test /prompt: text area for user to type in a message, send this as 'user' role in messages, include a fixed system prompt. user clicks a button to send, then display the response below.

Test /batchScore: text area for user to put in judgingMatrix, make up a 3 item dummy data `tests` array. User clicks button to send, UI shows progress bar, once it's complete the results are displayed below.



