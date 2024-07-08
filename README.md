# Rank In Competition Api
## Basically the wca psych sheets in an api form: Find out the sorted list by pbs in an event in a competiton that has not happened yet

# Usage
Call (insert the url here) with the following parameters:
  - compId -> The competition Id of the comp you want to get the data from (Find out where to find the competition Id in [here](https://github.com/i6iesma/Competitors-in-competition)
- eventId -> The Event you want to get the data from in the WCA standard way of showing events ("333 for 3x3, 222 for 2x2...) Find out these [here](https://icons.cubing.net/)
- Format -> Either "single" or "avg", pretty self-explanatory
An example call to the api would be http://localhost:3000/?compId=SpeedcubeBajaOpen2024&eventId=333&format=single
