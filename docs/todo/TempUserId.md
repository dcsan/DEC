tempID

when a user comes to the app for first time
look in local storage for a temp user ID for them
or create one

then for all chat_logs sent to the server tag it with this tempID as a userID

this is so the 'admin/users'
can show a list of users
and chats for each user.

each time they come into the /chat view
create a new session
with new context.


