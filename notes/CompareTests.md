We're going to create a new UI component "UserJudge" that will be opened, involve some user interaction, and then be closed at some point. THe outcome of the user interaction should be saved/returned to the container/page that initiated this component, that's really importnat.

This component will take up about 80% of the screen height total. 

### Input to component
1. array of Test objects
2. `criteria` string

```
interface Test {
  id: number;
  text: string;
}
```
(imported from src/app/api/batchScore/route.ts)

### component setup
1. generate list of all combinations (not permutations) of 2 sets of Test objects 
2. randomize order

### what component does
the component is asking the user to indicate which Test of two Tests best matches `criteria`. the user answers, and we go to the next one

top of component: header asking "Which output is more `criteria`?"
Then give the two strings in cards side by side, labelled "A" and "B"
below have a slider with 5 stoppoints, labelled:
-1: "A a lot more `criteria`"
-0.5: A more `criteria`
0: Reasonably equal
0.5: B  more `criteria`
1: B a lot more `criteria`

The numbers aren't shown in the label, they're for the data collection

Make sure everything is centered so that the slider lines up with the string cards properly. Make sure the slider is wide enough to have space for the labels. make the label text reasonably small so it doesn't overlap.

### what's returned

return UserTestJudgement[]

```
export interface UserTestJudgement {
  testAid: number;
  testBid: number;
  judgement: number;
}
```
you'll need to create and export this interface, it doesn't exist yet.


### ending
This component will go away at some random point depending on when an api call from the containing element ends. i forget how that's handled in nextjs but I'm pretty sure htere's a way that the containing element can change a variable when the api clal ends and just close this window. But this component needs to either keep track of that and return when it changes, or consistently return the UserTestJudgements it generates. idk you work it out.
