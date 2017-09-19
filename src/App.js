import React, { Component } from 'react';
import './App.css'
import moment from 'moment'
import FlipMove from 'react-flip-move'
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

  async fetch() {
    const timestamp = this.getTimestamp()
    const response = await fetch(`https://pressminder.org/v1/${timestamp}/publication`)
    const data = await response.json()
    const promises = []
    for (const publication of data) {
      promises.push(
        fetch(`https://pressminder.org/v1/${timestamp}/publication/${publication.id}/articles?count=5`)
        .then(response => response.json())
        .then(data => {
          publication.articles = data
        })
      )
    }
    await Promise.all(promises)
    this.setState({
      timestamp: timestamp,
      publications: data
    })
  }

  componentWillMount() {
    this.fetch()

    this.interval = setInterval(() => {
      if (!this.getSpeed()) {
        return
      }
      const newTimestamp = Math.round((this.getTimestamp() + this.getSpeed()) / 3600) * 3600
      if (newTimestamp >= (Date.now() / 1000)) {
        return
      }
      this.props.history.push(`?timestamp=${newTimestamp}`)
    }, 2000)
  }

  componentWillReceiveProps() {
    this.fetch()
  }

  render() {
    return (
      <div className="Home">
        <div className="Home-header">
          {this.state.timestamp ? 
          <DateSlider
            timestamp={this.state.timestamp}
            speed={this.getSpeed()}
          />
          : ''}
        </div>
        {this.state.publications.map(publication => {
          return (
            <Publication
              key={publication.id}
              timestamp={this.getTimestamp()}
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
  }

  componentWillMount() {
    console.log("mounting")
  }

  render() {
    return (
      <div className="Publication">
        <div className="Publication-title">
          {this.props.publication.name}
        </div>
        <FlipMove
          enterAnimation="none" 
          leaveAnimation="none"
          appearAnimation="fade"
          className="Publication-articles"
        >
          {this.props.publication.articles.map(article => {
            return (
              <Article key={`${article.url}-${article.top}`} { ...article }/>
            )
          })}
        </FlipMove>
      </div>
    );
  }
}

class Article extends Component {
  render() {
    return (
      <div className="Article">
        <a className="Article-title" href={this.props.url}>
          {this.props.title}
        </a>
      </div>
    )
  }
}

const DateSlider = ({ timestamp, speed }) => (
  <div className="DateSlider">
    <div className="DateSlider-value">{moment.unix(timestamp).format('MMMM Do YYYY, ha')}</div>
    {!speed ?
      <div className="DateSlider-actions">
        <Link className="DateSlider-action" to={`?timestamp=${timestamp}&speed=-3600`}>Backward</Link>
        <Link className="DateSlider-action" to={`?timestamp=${timestamp}&speed=3600`}>Forward</Link>
      </div>
    : speed > 0 ?
      <div className="DateSlider-actions">
        <Link className="DateSlider-action" to={`?timestamp=${timestamp}&speed=-3600`}>Backward</Link>
        <Link className="DateSlider-action" to={`?timestamp=${timestamp}&speed=0`}>Pause</Link>
      </div>
      :
      <div className="DateSlider-actions">
        <Link className="DateSlider-action" to={`?timestamp=${timestamp}&speed=0`}>Pause</Link>
        <Link className="DateSlider-action" to={`?timestamp=${timestamp}&speed=3600`}>Forward</Link>
      </div>
    }
  </div>
)

export default App;
