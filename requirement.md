start a nextjs project that firing request to hoyoverse api and visualize data from my requirement belows. 

**IMPORTANT NOTE** 
also the current given infomation in HoYoLAB_API.postman_collection.json is not enough and just an example resource for firing request, so please find the correct endpoint to gather needed information to visualize them.

all infomation is in HoYoLAB_API.postman_collection.json (tested & worked)

here are my requirements

| description | example data | needed icon image (available through api fetch) | show time remaining status (yes/no) | extra graphical requirements | additional tips |
| :--- | :---: | :---: | :---: | :---: | ---: |
| visualize GENSHIN daily commission rewards status | [0/4 or 4/4 or x/4] | daily commission rewards's icon image | - | value == 4/4 ? green background : yellow background | - |
| visualize GENSHIN original resin status | [31/200 or 159/200 or xx/200 or  xxx/200] | original resin's icon image | - | SVG progress bar of 0-100% (based on current value 0-200) |  - |
| visualize GENSHIN dispatched expeditions status | [0/5 or 5/5 or x/5] | current ongoing expeditions of 5 characters icon image | - | value == 5/5 ? yellow background : green background | - |
| visualize GENSHIN jar of riches status | [0/2400 or 1560/2400 or xxx/2400. xxxx/2400] | realm currency's icon image | - | SVG progress bar of 0-100% (based on current value 0-1200) |  - |
| visualize GENSHIN enemies of note status (remaining resin cost-halving opportunities this week) | [0/3 or  3/3 or  x/3] | trouce domain's icon image | - | value == 0/3 ? green background : yellow background | - |
| visualize GENSHIN parametric transformer cooldown status | can be used again after [1d or 3d or xd] | parametric transformer's icon image | - | - | - |
| visualize GENSHIN spiral abyss status (current stars obtained) | [18/36 or 27/36 or 36/36 or xx/36] | spiralabyss's star icon image | yes | value == 36/36 ? green background : yellow background | - |
| visualize GENSHIN imaginarium theater status (current stars obtained) | [0/12 or 10/12 or 12/12 or x/12 or xx/12] | imaginarium's star icon image | yes | value == 12/12 ? green background : yellow background | - |
| visualize GENSHIN stygian onslaught status (current difficulty obtained) | [difficulty V 323s or difficulty III 168s or none 0s] | stygian's difficulty icon image and seconds used | yes | value == "difficulty V" ? green background : yellow background | data available through event calendar -> events overviews |
| visualize GENSHIN stygian onslaught's disturbance outbreak status | [0/1200 or 380/1200 or xxx/1200 or xxxx/1200] | disturbance outbreak's icon image | yes | value == 1200/1200 ? green background : yellow background | data available through event calendar -> events overviews | - |
| visualize HSR daily training status | [0/500 or 200/500 or 500/500 or xxx/500] | - | - | value == 500/500 ? green background : yellow background | - |
| visualize HSR trailblaze power status | [0/300 or 128/300 or 300/300 or xxx/300] | trailblaze power's icon image | - | SVG progress bar of 0-100% (based on current value 0-300) |  - |
| visualize HSR echo of war status | [0/3 or 3/3 or x/3] | - | - | - | - |
| visualize HSR accumulated point status | [0/18000 or 18000/18000 or xxxxx/18000] | simulated universe's icon image | - | value == 18000/18000 ? green background : yellow background | - |
| visualize HSR forgotten hall status (current stars obtained) | [0/36 or 36/36 or xx/36] | forgotten hall's star icon image | yes | value == 36/36 ? green background : yellow background | - |
| visualize HSR pure fiction status (current stars obtained) | [6/12 or 12/12 or xx/12] | pure fiction's star icon image | yes | value == 12/12 ? green background : yellow background | - |
| visualize HSR apocalyptic shadow status (current stars obtained) | [6/12 or 12/12 or xx/12] | apocalyptic shadow's star icon image | yes | value == 12/12 ? green background : yellow background | - |
| visualize HSR anomaly arbitration's knight stage records status (current stars obtained) | [0/9 or 6/9 or 8/9 or 9/9 or x/9] | anomaly arbitration's star icon image | yes | value != 0/12 ? green background : yellow background | - |
| visualize HSR anomaly arbitration's king in check stage records status (current stars obtained) | [0/3 or 1/3 or x/3] | special color star icon image | yes | value == 1/3 ? green background : yellow background | - |
| visualize ZZZ battery energy status | [0/240 or 147/240 or 240/240 or xxx/240] | battery energy's icon image | - | SVG progress bar of 0-100% (based on current value 0-240)  | - |
| visualize ZZZ daily mission's engagement today status | [0/400 or 400/400 or xxx/400] | - | - | value == 400/400 ? green background : yellow background | - |
| visualize ZZZ season mission's bouty commission progress status | [0/8000 or 8000/8000 or xxxx/8000] | - | - | value == 8000/8000 ? green background : yellow background | - |
| visualize ZZZ season mission's ridu weekly point status | [0/2100 or 1700/2100 or xxxx/2100] | - | - | value >= 1700/2100 ? green background : yellow background | - |
| visualize ZZZ deadly assult status | total scores and [0/9 or 6/9 or 8/9 or 9/9 or x/9] (current stars obtained) | deadly assult's star icon image | yes | value >= 6/9 ? green background : yellow background | - |
| visualize ZZZ shiyu defense status | total scores and current fifth frontier rank [S or A or B or none] | [S or A or B] rank icon image | yes | value == S ? green background : yellow background | - |
