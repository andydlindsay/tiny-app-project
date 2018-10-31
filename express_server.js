const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  'userRandomId': {
    id: 'userRandomId',
    email: 'user@example.com',
    password: 'purple-monkey-dinosaur'
  },
  'user2RandomId': {
    id: 'user2RandomId',
    email: 'user2@example.com',
    password: 'dishwasher-funk'
  },
};

function generateRandomString(stringLength) {
  let outputString = '';
  for(let i = 0; i < stringLength; i++) {
    const randomNumber = Math.floor(Math.random() * 62) + 1;
    if (randomNumber <= 10) {
      outputString += String.fromCharCode(58 - randomNumber);
    } else if (randomNumber <= 36) {
      outputString += String.fromCharCode(101 - randomNumber);
    } else {
      outputString += String.fromCharCode(159 - randomNumber);
    }
  }
  return outputString;
}

app.get('/register', (request, response) => {
  response.render('register');
});

app.post('/register', (request, response) => {
  // check if email and password have been passed in
  if (request.body.email && request.body.password) {
    // check to make sure that email is unique
    for (let key in users) {
      if (users[key].email === request.body.email) {
        // email is not unique, return 400
        response.status(400);
        response.end();
        return;
      }
    }
    // everything is fine, generate new user object
    const id = generateRandomString(10);
    const newUser = {
      id,
      email: request.body.email,
      password: request.body.password,
    };
    users[id] = (newUser);
    response.cookie('user_id', id);
    response.redirect('/urls');
  } else {
    // email and/or password have not been passed in
    response.status(400);
    response.end();
  }
});

app.post('/login', (request, response) => {
  if (request.body.username) {
    response.cookie('username', request.body.username);
  }
  response.redirect('/urls');
});

app.post('/logout', (request, response) => {
  response.clearCookie('username');
  response.redirect('/urls');
});

app.get('/urls.json', (request, response) => {
  response.json(urlDatabase);
});

app.get('/urls', (request, response) => {
  let templateVars = {
    urlDatabase,
    username: request.cookies['username'],
  };
  response.render('urls_index', templateVars);
});

app.post('/urls', (request, response) => {
  const shortUrl = generateRandomString(6);
  urlDatabase[shortUrl] = request.body.longURL;
  response.redirect(`/urls/${shortUrl}`);
});

app.get('/urls/new', (request, response) => {
  let templateVars = {
    username: request.cookies['username'],
  };
  response.render('urls_new', templateVars);
});

app.post('/urls/:id/delete', (request, response) => {
  const shortUrl = request.params.id;
  if (urlDatabase[shortUrl]) {
    delete urlDatabase[shortUrl];
  }
  response.redirect('/urls');
});

app.post('/urls/:id', (request, response) => {
  const longUrl = request.body.longURL;
  const shortUrl = request.params.id;
  if (longUrl) {
    urlDatabase[shortUrl] = longUrl;
  }
  response.redirect('/urls');
});

app.get('/urls/:id', (request, response) => {
  let templateVars = {
    shortURL: request.params.id,
    longURL: urlDatabase[request.params.id],
    username: request.cookies['username'],
  };
  response.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (request, response) => {
  const longURL = urlDatabase[request.params.shortURL];
  if (longURL) {
    response.redirect(longURL);
  } else {
    response.redirect('/urls');
  }
});

app.get('/hello', (request, response) => {
  response.end('<html><body>Hello <b>World</b></body></html>\n');
});

app.get('/', (request, response) => {
  response.send('Hello!');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
