# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Robin Herberich | 355741 |
| Antoine Emmanuel Bachmann | 336641 |
| | |

[Milestone 1](#milestone-1-20th-march-5pm) • [Milestone 2](#milestone-2-17th-april-5pm) • [Milestone 3](#milestone-3-29th-may-5pm)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*

### Datasets


#### 1. Top names of female cows by language region (Switzerland)
**Link :** https://opendata.swiss/en/dataset/rinder-namen-der-weiblichen-rinder

**Format :** CSV

**Quality :** Perfect, no special cleaning or processing necessary.

#### 2. Evolution of the usage of milk in Switzerland (1999-2024)
**Link :** https://opendata.swiss/en/dataset/verwertung-der-gemolkenen-kuhmilch4

**Format :** XLS, not machine readable formatting, manual conversion to CSV necessary.

**Quality :** Okay, no special cleaning or processing necessary except for removing 1999 since it does not have the same categories.

#### 3. Evolution of the number of cows by usage (Switzerland)
**Link :** https://opendata.swiss/en/dataset/rinder-entwicklung-nach-nutzungsarten

CSV, no special cleaning or processing necessary.

#### 4. Evolution of the number of cows by canton  (Switzerland)
**Link :** https://opendata.swiss/en/dataset/rinder-entwicklung-nach-kantonen

CSV, no special cleaning or processing necessary.

#### 5. Monthly milk producer prices (Switzerland)
**Link :** https://opendata.swiss/en/dataset/marktzahlen-milch-undmilchprodukte-4

SPARQL backend, needs to be queried, returns a CSV, no special cleaning or processing necessary.

#### 6. Monthly consumer prices for different dairy products (Switzerland)
**Link :** https://opendata.swiss/en/dataset/marktzahlen-milch-undmilchprodukte-9

SPARQL backend, needs to be queried, returns a CSV, large dataset that may need light cleanup, generally good data.

#### 7. Monthly average heard size by usage (Switzerland) 
**Link :** https://opendata.swiss/en/dataset/rinder-herdengrossen-der-tierhaltungen-nach-nutzungsart

CSV, no special cleaning or processing necessary.

#### 8. Monthly average heard size and number of holdings (Switzerland) 
**Link :** https://opendata.swiss/en/dataset/rinder-herdengrossen-der-tierhaltungen

CSV no special cleaning or processing necessary.

#### 9. MenuCH study, dairy consumption in switzerland (2015) 
**Link :** https://opendata.swiss/de/dataset/menuch_lebensmittelkonsum/resource/ca928bd5-95c4-47d5-8c95-8e1d62dd6e22

XLS, not machine readable formatting, manual conversion to CSV necessary.

We chose a wide array of smaller datasets regarding Swiss dairy production, consumption, and prices, enabling us to combine diverse sources to generate new insights and a comprehensive picture of the industry.

### Problematic

> Frame the general topic of your visualization and the main axis that you want to develop.
> - What am I trying to show with my visualization?
> - Think of an overview for the project, your motivation, and the target audience.

In this project we wish to underline how economic divides between consumers and producers have impacted the types and quantities of diary products produced and consumed by region.

Or in simpler terms, we'd like to show how much the past XX years of economical difficulties have changed the logistical and productive landscape of swiss dairy. This would mostly be of interest to businesses, especially suppliers and producers who might be able to cross-reference the project with arable land/available cattle to guess at longer term trends, and optimize present logistical networks. We have decided to throw ourselves into this venue of questioning as big picture analysis of an antire sector is fairly rare, and as such our presentation could be both rather instructive, and hard to find elsewhere.

### Exploratory Data Analysis

> Pre-processing of the data set you chose
> - Show some basic statistics and get insights about the data

### Related work

[Swissmilk article](https://www.swissmilk.ch/fr/producteurs-de-lait/marche/acteurs-et-structure-du-marche/producteurs-de-lait/) about dairy in Switzerland

#### Why is our approach original?
Most websites and visualizations about this topic are a bit old, use static charts and only highlight single metrics. 
- Rather than viewing production, pricing, and consumption separately, we will correlate these diverse datasets to reveal hidden relationships. For example, we can visually link the evolution of herd sizes and milk usage with the growing gap between producer and consumer prices, while also weaving in cultural elements like regional cow names to keep the narrative engaging
- We will create dynamic visualizations that let the user explore the data by themselves, which is a lot more fun than static charts that only provide a narrow way of interacting with the topic.
#### Inspiration
1. Interactive canton map for showcasing cantonal data (number of cows per canton)

    <img src="readme_images/interactive_canton_map.png" width="500">
    
    Source: https://www.watson.ch/schweiz/arbeitswelt/438746096-du-willst-wissen-wer-in-deinem-kanton-als-reich-gilt-wir-zeigen-es-dir

    We can extend this with a timeline slider to show how the data evolved over time.


## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**

