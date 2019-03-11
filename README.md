# timetastic-teams-hook
Simple AWS Lambda function to pull absence data from [Timetastic](https://timetastic.co.uk/) and post to a channel in [Microsoft Teams](https://products.office.com/en-gb/microsoft-teams/group-chat-software?rtc=1)

# usage
- Clone repository
- Run `npm install --only=prod` to grab [Axios](https://github.com/axios/axios) dependancy
- Zip `node_modules` and `index.js` and upload to AWS Lambda
- Create two environment variables for the lambda function:
  - `TIMETASTIC_AUTH`: Your API key from Timetastic
  - `TEAMS_WEBHOOK_URL`: The URL given when adding an `incoming webhook` connector to your desired Teams channel
- Set a Cloudwatch Events trigger to run the function on a daily basis
