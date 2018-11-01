require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  secret: process.env.SECRET_KEY,
}));

const urlDatabase = {};

const users = {};

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

function urlsForUser(user_id) {
  const userUrls = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url].user_id === user_id) {
      userUrls[url] = urlDatabase[url];
    }
  }
  return userUrls;
}

app.get('/register', (request, response) => {
  const templateVars = {
    user: users[request.session.user_id],
  };
  if (templateVars.user) {
    // user is logged in
    response.redirect('/urls');
  } else {
    response.render('register', templateVars);
  }
});

app.post('/register', (request, response) => {
  // check if email and password have been passed in
  if (request.body.email && request.body.password) {
    // check to make sure that email is unique
    for (let key in users) {
      if (users[key].email === request.body.email) {
        // email is not unique, return 400
        response.status(400);
        response.send('Email already exists');
        return;
      }
    }
    // everything is fine, generate new user object
    const id = generateRandomString(10);
    const newUser = {
      id,
      email: request.body.email,
      password: bcrypt.hashSync(request.body.password, 10),
    };
    users[id] = newUser;
    request.session.user_id = id;
    response.redirect('/urls');
    return;
  } else {
    // email and/or password have not been passed in
    response.status(400);
    response.send('Email and password fields cannot be blank');
    return;
  }
});

app.get('/login', (request, response) => {
  const templateVars = {
    user: users[request.session.user_id],
  };
  if (templateVars.user) {
    // user is logged in
    response.redirect('/urls');
  } else {
    response.render('login', templateVars);
  }
});

app.post('/login', (request, response) => {
  // check if email and password have been passed in
  if (request.body.email && request.body.password) {
    const email = request.body.email;
    const password = request.body.password;
    let userFound = false;
    for (let user in users) {
      if (users[user].email === email) {
        userFound = true;
        if (bcrypt.compareSync(password, users[user].password)) {
          // good password
          request.session.user_id = users[user].id;
          response.redirect('/urls');
        } else {
          // bad password
          response.status(403);
          response.send('Incorrect password');
          return;
        }
      }
    }
    if (!userFound) {
      // email did not match any existing users
      response.status(403);
      response.send('Email not found');
      return;
    }
  } else {
    // no content in either email or password
    response.status(403);
    response.send('Email and password fields cannot be blank');
    return;
  }
});

app.post('/logout', (request, response) => {
  request.session = null;
  response.redirect('/urls');
});

app.get('/urls', (request, response) => {
  const user_id = request.session.user_id;
  let templateVars = {
    urlDatabase: urlsForUser(user_id),
    user: users[user_id],
  };
  response.render('urls_index', templateVars);
});

app.post('/urls', (request, response) => {
  if (request.session.user_id) {
    const shortUrl = generateRandomString(6);
    const longURL = request.body.longURL;
    if (longURL.length > 5) {
      const newUrl = {
        longURL,
        user_id: request.session.user_id,
      };
      urlDatabase[shortUrl] = newUrl;
      response.redirect(`/urls/${shortUrl}`);
    } else {
      response.redirect('/urls');
    }
  } else {
    response.status(401);
    response.send('You must be logged in to submit a URL');
  }
});

app.get('/urls/new', (request, response) => {
  let templateVars = {
    user: users[request.session.user_id],
  };
  if (templateVars.user) {
    response.render('urls_new', templateVars);
  } else {
    response.redirect('/login');
  }
});

app.post('/urls/:id/delete', (request, response) => {
  const shortUrl = request.params.id;
  const user_id = request.session.user_id;
  if (user_id) {
    // user is logged in
    if (urlDatabase[shortUrl].user_id === user_id) {
      // url belongs to the requesting user
      if (urlDatabase[shortUrl]) {
        delete urlDatabase[shortUrl];
      }
      response.redirect('/urls');
    } else {
      // url does not belong to the request user
      response.status(401);
      response.send('Users may only delete their own shortened URLs');
    }
  } else {
    // user is not logged in
    response.status(401);
    response.send('You must be logged in to delete URLs');
  }
});

app.post('/urls/:id', (request, response) => {
  const longUrl = request.body.longURL;
  const shortUrl = request.params.id;
  const user_id = request.session.user_id;
  if (urlDatabase[shortUrl].user_id === user_id) {
    if (longUrl) {
      urlDatabase[shortUrl].longURL = longUrl;
    }
  }
  response.redirect('/urls');
});

app.get('/urls/:id', (request, response) => {
  const shortURL = request.params.id;
  if (urlDatabase[shortURL]) {
    // found matching url in db
    if (urlDatabase[shortURL].user_id === request.session.user_id) {
      let templateVars = {
        shortURL,
        longURL: urlDatabase[request.params.id].longURL,
        user: users[request.session.user_id],
      };
      response.render('urls_show', templateVars);
      return;
    } else {
      if (request.session.user_id) {
        response.status(400);
        response.send('Users may only view their own shortened URLs');
        return;
      } else {
        // url does not belong to requesting user
        response.status(400);
        response.send('Please log in to view your URLs');
        return;
      }
    }
  } else {
    response.status(404);
    response.send('URL not found');
    return;
  }
});

app.get('/u/:shortURL', (request, response) => {
  const url = urlDatabase[request.params.shortURL];
  if (url) {
    const longURL = url.longURL;
    response.redirect(longURL);
  } else {
    // unable to find url in urlDatabase
    response.status(404);
    response.send('Shortened URL does not exist');
  }
});

app.get('/', (request, response) => {
  const user = users[request.session.user_id];
  if (user) {
    response.redirect('/urls');
  } else {
    response.redirect('/login');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
