import React, { Component } from 'react';
import './App.css'
import moment from 'moment'
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom'

class App extends Component {
  render() {
    return (
      <Router>
        <div className="App">
          <Route exact path="/" component={Home}/>
        </div>
      </Router>
    );
  }
}

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      publications: []
    }
  }

  getSpeed() {
    const query = new URLSearchParams(window.location.search)
    return parseInt(query.get('speed') || -3600)
  }

  getTimestamp() {
    const query = new URLSearchParams(window.location.search)
    return parseInt(query.get('timestamp') || Math.round(Date.now() / 1000))
  }

  fetch() {
    fetch(`https://pressminder.org/v1/publication?timestamp=${this.getTimestamp()}`)
    .then(response => response.json())
    .then(data => {
      this.setState({
        publications: data
      })
    })
  }

  componentWillMount() {
    this.fetch()

    this.interval = setInterval(() => {
      const newTimestamp = this.getTimestamp() + this.getSpeed()
      if (newTimestamp >= (Date.now() / 1000)) {
        return
      }
      this.props.history.push(`?timestamp=${newTimestamp}`)
    }, 5000)
  }

  componentWillReceiveProps() {
    this.fetch()
  }

  render() {
    const timestamp = this.getTimestamp()
    return (
      <div className="Home">
        <div className="Home-header">
          <DateSlider
            value={timestamp}
          />
        </div>
        {this.state.publications.map(publication => {
          return (
            <Publication
              key={publication.id}
              timestamp={timestamp}
              publication={publication}
            />
          )
        })}
      </div>
    )
  }
}

class Publication extends Component {
  constructor(props) {
    super(props);
    this.state = {articles: []}
  }

  fetch() {
    fetch(`https://pressminder.org/v1/publication/${this.props.publication.id}/articles?count=5&timestamp=${this.props.timestamp}`)
    .then(response => response.json())
    .then(data => {
      this.setState({
        articles: data
      })
    })
  }

  componentWillMount() {
    this.fetch()
  }

  componentWillReceiveProps() {
    this.fetch()
  }

  render() {
    return (
      <div className="Publication">
        <div className="Publication-preview">
          <img src={`https://pressminder.imgix.net/${this.props.publication.screenshot}?fm=jpg&w=160`}/>
        </div>
        <div className="Publication-articles">
          {this.state.articles.map(article => {
            return (
              <Article key={article.url} { ...article }/>
            )
          })}
        </div>
      </div>
    );
  }
}

const Article = ({ title, url }) => (
  <div className="Article">
    <a className="Article-title" href={url}>
      {title}
    </a>
  </div>
)

const DateSlider = ({ value }) => (
  <div className="DateSlider">
    <span className="DateSlider-value">{moment.unix(value).format('MMMM Do YYYY, h:mm a')}</span>
  </div>
)

export default App;
