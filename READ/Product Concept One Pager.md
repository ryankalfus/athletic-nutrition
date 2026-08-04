# **Software & Technology**

# **Product Concept**

## **Product Vision**

### ***A concise 1-2 sentence statement describing what your product is and the core value it will deliver.***

| Nourally is a mobile and web nutrition-logistics assistant that turns a student-athlete’s real school, practice, workout, game, and travel schedule into practical eating, hydration, packing, and preparation guidance. It helps athletes and families determine what food is realistic, when it can be eaten, and what needs to be prepared or purchased ahead of time. |
| :---- |

## 

## **Problem Statement**

## ***Clearly articulate the problem your software/technology will solve. What pain points exist that your solution addresses?***

| Student-athletes must fit food and hydration into class periods, limited lunch windows, travel, practices, games, homework, and family schedules. Generic calorie trackers record food after it is eaten but rarely help athletes decide what can realistically be packed, bought, stored, heated, or eaten before the next activity. Families also lack a shared view of upcoming grocery, packing, and preparation needs. |
| :---- |

## 

## **Target Users** 

### ***Describe who will use your product and why.***

| The primary users are middle school and high school student-athletes ages 14–18 who participate in organized sports and need practical nutrition support around school and training. Parents and guardians are important secondary users who can help with groceries, meal preparation, transportation, and reminders. Coaches may provide schedule information, but should not receive unnecessary private health or nutrition data. |
| :---- |

### **User Needs: \[List 2-3 key needs your users have\]**

| A single calendar containing school, workouts, practices, games, and travel. Practical meal, snack, hydration, packing, and preparation guidance based on available time, food access, storage, dietary restrictions, and budget. Optional parent coordination plus simple progress reflection without punitive food judgments or rigid weight-loss messaging. |
| :---- |

### 

## **Solution Overview** 

### ***Describe your proposed software/technology solution and how it addresses the problem.***

| Nourally begins with the athlete’s real schedule. Users can enter workouts, practices, and games and import a recurring school year with school-day times and selected weekdays. School can be hidden globally or canceled on individual dates for holidays, closures, or absences. Reviewed nutrition rules will identify realistic food and hydration windows around these commitments; AI may explain or adapt approved options, but should not independently invent medical-style targets. Selected suggestions can become reminders, packing lists, grocery lists, and parent preparation tasks. |
| :---- |

### **Key Features (MVP)**

### ***List the essential features that will be included in your Minimum Viable Product.***

**Feature 1: Whole-Day Schedule**

- School-year import with start and end dates, school-day hours, and active weekdays
- Workout, practice, and game scheduling with time, duration, and intensity
- Global school-calendar visibility and per-day school cancellation
- Future import or sync from school and team calendar sources

**Feature 2: Schedule-Aware Nutrition Logistics**

- Reviewed pre-activity, during-activity, recovery, and hydration guidance
- Recommendations matched to eating windows, travel, refrigeration, microwave access, allergies, food preferences, and budget
- Meal, snack, hydration, packing, and “prepare tonight” reminders
- Training-day, game-day, school-day, travel-day, and rest-day adjustments

**Feature 3: Food, Packing & Family Support**

- Meal and hydration logging with barcode convenience
- Weekly grocery and game-day packing lists with affordable substitutions
- Optional parent or guardian coordination for purchasing and preparation
- Practicality feedback and weekly summaries focused on consistency, energy, and recovery

## **Technology Stack**

| *Frontend: \[E.g., React, Vue.js, HTML/CSS/JavaScript\]*  | React for the current responsive web prototype; React Native may support a future mobile application. Built with HTML, CSS, JavaScript, and assistance from ChatGPT Codex. |
| :---- | :---- |
| ***Backend: \[E.g., Node.js, Python/Django, Firebase\]***  | Firebase Node.js (if needed for custom backend functions)  |
| ***Database: \[E.g., MongoDB, PostgreSQL, MySQL, Firebase Realtime Database\]***  | Firebase Firestore |
| ***Additional Technologies: \[E.g., APIs, libraries, frameworks\]***  | Firebase Authentication; a reviewed deterministic nutrition-rules layer; USDA FoodData Central plus Open Food Facts for barcode convenience; calendar import APIs; optional OpenAI API for explaining approved options rather than creating unrestricted medical advice; Figma for UI/UX design. |
| ***Deployment: \[E.g., Heroku, Netlify, AWS, App Store, Google Play\]*** | Firebase Hosting (web) Google Play Store and/or Apple App Store (future mobile release)  |

## 

## **Technical Feasibility** 

### ***Assess your ability to build this product given your current skills and the project timeline.***

| *Required Skills: \[List technical skills needed\]*  | HTML, CSS, JavaScript, React or React Native, recurring calendar and exception logic, Firebase Authentication and Firestore, food-data integration, deterministic rule design, prompt engineering, youth-centered privacy, accessibility, UI/UX design, and product testing. |
| :---- | :---- |
| ***Current Experience: \[Describe your relevant experience\]***  | I have experience programming and am interested in technology and AI. I have worked with coding concepts and am motivated to build a full-stack application while learning new development tools throughout this project.  |
| ***Learning Needs: \[Skills you'll need to acquire\]***  | Secure authentication and data storage; school and team calendar import; schedule-aware recommendation logic; safe and age-appropriate nutrition content; family permissions and consent; production deployment, monitoring, and testing. |
| ***Technical Challenges: \[Potential obstacles\]***  | Representing recurring school and training schedules with holidays, cancellations, travel, and exceptions. Producing useful guidance without implying medical precision or encouraging restrictive eating. Protecting schedule and health-related information for minors. Establishing qualified professional review, reliable food data, consent and deletion controls, and clear boundaries between deterministic safety rules and optional AI explanations. |
