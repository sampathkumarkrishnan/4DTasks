# 4D-tasks

## Overview 
I would like to build an application that helps me to manage my tasks and priorities effectively. For this, I would like to use the Eisenhower matrix which includes the 4Ds (Do, Delegate, Delay and Delete). I would like to build this as a web application and using Google tasks as the backend for the tasks. I would like to customize this even further by providing an option to the customer to choose Google Tasks or Todoist or any other Todo app as the backend. But for now, let's stick with Google Tasks.

## Objective
Create a web app that displays four different sections in the web page similar to app.eisenhower.me. The four sections should be Do, Delegate, Delay and Delete. Here is the list of capabilities that need to be available in this application

* As a user, I should be able to create a new task in any of the four sections
* As a user, I should be able to move an existing task from one section to another by dragging and dropping
* As a user, I should be able to delete an existing task in any of the four sections
* As a user, I should be able to mark a task as completed
* As a user, I should be able to set the date and time for a task when I add/move it to the Do/Delay sections
* As a user, I should be able to assign a task to another person from my Google contacts directory when I move it to the Delegate section
* As a user, I should be able to see the list of completed and deleted tasks in each of the four sections
* As a user, I should be able to assign a category to a new or existing task
* As a user, I should be able to create a new category if it does not exist, while assigning a task to that category

### Google Tasks integration
I would like to use Google tasks at the background for this application. So whenever I try to create a task in this app as a user, it creates a task in Google Tasks. 

* As a user, when I create a task in this application, it should create a task in Google Tasks
* As a user, when I create a category in this application, it should create a new list with the same name in Google Tasks
* As a user, when I assign a category for a task, it should move the task to the corresponding list in Google Tasks
* As a user, when I delegate a task to another user, I would like that user to be one of the google users in my organization
* As a user, when I try to delegate a task to another user, I would like to enter their email and the application should provide suggestions/autofill based on users in my google contacts
* As a user, when I move a task to the delay section and set a date and time, it should set the date and time for the corresponding task in the Google tasks as well
* As a user, when I mark a task as completed, it should mark the corresponding task in Google tasks as completed as well
* As a user, when I delete a task, it should delete the corresponding task in Google tasks as well

### Future usecases
* As a user, I would like to use either Google tasks or Todoist as my backend for the app. But this option is for future. Now let's stick with Google Tasks alone.

## Technology stack
* Recommendation is to use React for frontend
* Use Material UI as the design system and use MUI library for the UI components
* Use a pleasant looking theme with not so bright colours
* Design the layout similar to that of app.eisenhower.me
* See if it is possible to build this app with just the frontend and using Google tasks as the backend
