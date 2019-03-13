const axios = require('axios');

const today = new Date().toISOString().slice(0, 10);
const config = {
  headers: {
    Authorization: `Bearer ${process.env.TIMETASTIC_AUTH}`,
  },
};

const card = {
  '@type': 'MessageCard',
  '@context': 'http://schema.org/extensions',
  summary: 'Timetastic Absences Report',
  sections: [
    {
      activityTitle: `Absences today (${today}):`,
    },
  ],
};

async function getUsers() {
  try {
    const response = await axios.get('https://app.timetastic.co.uk/api/users', config);
    const users = response.data.map((user) => {
      const obj = {
        username: `${user.firstname} ${user.surname}`,
        departmentName: user.departmentName,
      };
      return obj;
    });
    return users;
  } catch (err) {
    throw new Error(err);
  }
}

async function getHolidays() {
  try {
    const response = await axios.get(`https://app.timetastic.co.uk/api/holidays?Start=${today}&End=${today}`, config);
    const holidays = response.data.holidays.map((holiday) => {
      const obj = {
        userName: holiday.userName,
        startDate: holiday.startDate,
        startType: holiday.startType,
        endDate: holiday.endDate,
        endType: holiday.endType,
        status: holiday.status,
        leaveType: holiday.leaveType,
      };
      return obj;
    });
    return holidays;
  } catch (err) {
    throw new Error(err);
  }
}

async function postToTeams(card) {
  try {
    const response = await axios.post(process.env.TEAMS_WEBHOOK_URL, card, {
      headers: {
        'content-type': 'application/vnd.microsoft.teams.card.o365connector',
        'content-length': `${card.toString().length}`,
      },
    });
    return `${response.status} - ${response.statusText}`;
  } catch (err) {
    throw new Error(err);
  }
}

function determineHolidayLength(startDate, startType, endDate, endType) {
  if (startDate === endDate) {
    // Today only, morning or afternoon
    if (startType === 'Morning' && endType === 'Morning') {
      return 'AM';
    }
    if (startType === 'Afternoon' && endType === 'Afternoon') {
      return 'PM';
    }
    return 'All day';
  }

  return 'All day';
}

async function getHolidayList() {
  const users = await getUsers();
  const holidays = await getHolidays();

  const holidayList = users.map((user) => {
    const rUser = { ...user };
    rUser.holidays = holidays.filter(holiday => holiday.userName === rUser.username);
    return rUser;
  }).reduce((acc, obj) => {
    const key = obj.departmentName;
    if (obj.holidays.length > 0) {
      acc[key] = acc[key] || [];
      acc[key].push(obj);
    }
    return acc;
  }, {});

  return Object.keys(holidayList).sort().reduce((result, key) => {
    const r = result;
    r[key] = holidayList[key];
    return r;
  }, {});
}

exports.handler = async () => {
  const data = await getHolidayList();
  
  if (Object.keys(data).length === 0 && data.constructor === Object) {
    console.log('no absences');
    return 'No absences to report';
  } else {
    const departments = Object.keys(data);
    let text = '';

    departments.forEach((d) => {
      text += `**${d}**\n\n`;
      const absences = data[d];

      absences.forEach((a) => {
        const ab = a.holidays[0];
        text += `${ab.userName} - ${ab.leaveType} - ${determineHolidayLength(ab.startDate, ab.startType, ab.endDate, ab.endType)}\n\n`;
      });
    });

    const result = { text };
    card.sections.push(result);
    const posted = await postToTeams(card);
    return posted;
    };
};
