import React, { Component } from 'react';
import './App.css'
import FlipMove from 'react-flip-move'
import Datetime from 'react-datetime'
import {
  BrowserRouter as Router,
  Route  
} from 'react-router-dom'
import Slider from 'react-rangeslider'
import 'react-rangeslider/lib/index.css'

async function fetchSnapshot(names, timestamp) {
  return fetch(`https://api.pressminder.org/v1/snapshot/${names.join(',')}?count=10${timestamp ? '&timestamp=' + Math.round(timestamp / 1000) : ''}`)
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
    this.setState({timestamp, loading: true})
    fetchSnapshot(['nyt', 'bbc'], timestamp)
    .then(snapshot => {
      this.setState({snapshot, loading: false})
    })
  }


  componentWillMount() {
    const self = this
    let timestamp = 3600000 * Math.floor(Date.now() / 3600000)
    this.fetch(timestamp)
    this.fetchInterval = setInterval(() => {
      if (self.state.playing) {
        const newTimestamp = self.state.timestamp + 3600000 
        if (newTimestamp < Date.now()) {
          self.fetch(newTimestamp)
        } else {
          self.setState({playing: false})
        }
      }
    }, 1000)
  }

  coponentDidUnmount() {
    clearInterval(this.fetchInterval)
  }

  render() {
    let timestamp = 3600 * Math.floor(Date.now() / 1000 / 3600)
    return (
      <div className="Home">
        <div className="Home-header">
          <div className="Header-controls">
            <Datetime
              className="Header-datetime-control"
              value={new Date(this.state.timestamp)}
              onChange={momentObj => {
                if (momentObj.unix) {
                  this.fetch(momentObj.unix() * 1000)
                }
              }}
            />
            <button
              className="btn btn-dark Header-button-control"
              onClick={() => this.setState({playing: !this.state.playing})}
            >
              {this.state.playing ? 'Pause' : 'Play'}
            </button>
            <Slider
              min={timestamp - 604800}
              max={timestamp}
              step={3600}
              value={this.state.timestamp / 1000}
              orientation="horizontal"
              tooltip={false}
              onChange={value => {
                this.fetch(value * 1000)
              }}
            />
          </div>
        </div>
        <div className="Home-content">
          {Object.keys(this.state.snapshot).map(id => {
            return (
              <Publication
                key={id}
                articles={this.state.snapshot[id].articles}
                screenshot={this.state.snapshot[id].screenshot}
                loading={this.state.loading}
              />
            )
          })}
        </div>
      </div>
    )
  }
}

class Publication extends Component {
  constructor(props) {
    super(props);
    this.state = {
      imageLoaded: false
    }
  }

  componentDidReceiveProps(nextProps) {
    if (nextProps.screenshot !== this.props.screenshot) {
      console.log("reset")
      this.setState({imageLoaded: false})
    }
  }
  render() {
    return (
      <div className="Publication">
        <div className="Publication-screenshot">
          <img
            alt="screenshot"
            src={`https://d1qd36z8dssjk5.cloudfront.net/${this.props.screenshot}`}
            onLoad={() => this.setState({imageLoaded: true})}
          />
          {this.props.loading || !this.state.imageLoaded ?
            <div className="Publication-loading">
              <div className="loader"></div>
            </div>
          : ''}
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
        <a className="Article-title" target="_blank" href={this.props.url}>
          {this.props.title}
        </a>
      </div>
    )
  }
}

export default App;
