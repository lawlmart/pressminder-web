import React, { Component } from 'react';
import './App.css'
import FlipMove from 'react-flip-move'
import Datetime from 'react-datetime'
import {
  BrowserRouter as Router,
  Route  
} from 'react-router-dom'

async function fetchSnapshot(names, timestamp) {
  return fetch(`https://pressminder.org/v1/snapshot/${names.join(',')}?count=10${timestamp ? '&timestamp=' + Math.round(timestamp / 1000) : ''}`)
  .then(response => response.json())
}

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
      snapshot: {},
      playing: false,
      loading: true,
      timestamp: null
    }
  }

  fetch(timestamp) {
    this.setState({loading: true})
    fetchSnapshot(['nyt', 'bbc'], timestamp)
    .then(snapshot => {
      this.setState({snapshot, timestamp, loading: false})
    })
  }


  componentWillMount() {
    const self = this
    this.fetch(Date.now())
    this.fetchInterval = setInterval(() => {
      if (self.state.playing) {
        const newTimestamp = self.state.timestamp + 3600000 
        self.fetch(newTimestamp)
      }
    }, 500)
  }

  coponentDidUnmount() {
    clearInterval(this.fetchInterval)
  }

  render() {
    return (
      <div className="Home">
        <div className="Home-header">
          <div className="Header-controls">
            <Datetime
              className="Header-datetime-control"
              inputProps={{className: 'Header-datetime-control-input'}}
              value={new Date(this.state.timestamp)}
              onChange={momentObj => {
                this.fetch(momentObj.unix() * 1000)
              }}
            />
            <button
              className="Header-buttom-control"
              onClick={() => this.setState({playing: !this.state.playing})}
            >
              {this.playing ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
        <div className="Home-content">
          {Object.keys(this.state.snapshot).map(id => {
            return (
              <Publication
                key={id}
                articles={this.state.snapshot[id].articles}
                screenshot={this.state.snapshot[id].screenshot}
              />
            )
          })}
        </div>
      </div>
    )
  }
}

class Publication extends Component {

  render() {
    return (
      <div className="Publication">
        <div className="Publication-screenshot">
          <img alt="screenshot" src={`https://d1qd36z8dssjk5.cloudfront.net/${this.props.screenshot}`}/>
        </div>
        <FlipMove
          enterAnimation="none" 
          leaveAnimation="none"
          appearAnimation="fade"
          className="Publication-articles"
        >
          {this.props.articles.map(article => {
            return (
              <Article key={`${article.url}-${article.since}`} { ...article }/>
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

export default App;
