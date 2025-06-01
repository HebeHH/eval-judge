# EvalRater


At this point where are in the `EvalRater` component, and we have two bits of data:

* BatchScoreResult[]
* UserTestJudgement[]

```
interface UserTestJudgement {
  testAid: number;
  testBid: number;
  judgement: number; // ranges -1 to 1
}

interface BatchScoreResult {
  id: number;
  score: number; // ranges 0 to1
}
```

We want to show how well the User judgement (UserTestJudgement) compares to the AI judgement (BatchScoreResult). 

### Normalize the values

First step is to get the same structure of data for both types. We want:

```
interface NormalizedResults {
  testAid: number;
  testBid: number;
  userJudgement: number;
  aiJudgement: number;
}
```

Do this by mapping UserTestJudgement array.

For each UserTestJudgement, find `A.score` and `B.score` by matching `UserTestJudgementObj.testAid` to `NormalizedResultsObj.id` (and same for B). Then `aiJudgement =( B.score - A.score)/5` 


### Showing the results

Just show a scatterplot of 'User judgement' vs 'AI judgement'. Make it a pretty scatterplot and all.

Undeerneath show some summary stats showing the variation between the user and ai judgement, with a 'copy' button.


### other

if we've still got `criteria` and the selected eval prompt handy, it would be nice to show them too. but if they'd be hard to get then forget it.