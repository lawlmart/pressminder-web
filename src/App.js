import React, { Component } from 'react';
import './App.css'
import FlipMove from 'react-flip-move'
import Datetime from 'react-datetime'
import {
  BrowserRouter as Router,
  Route,
  Link  
} from 'react-router-dom'
import Slider from 'react-rangeslider'
import FontAwesome from 'react-fontawesome'
import createHistory from 'history/createBrowserHistory'
import queryString from 'query-string'
import moment from 'moment'
import 'react-rangeslider/lib/index.css'
const jsdiff = require('diff')
const history = createHistory()

async function fetchSnapshot(names, timestamp) {
  return fetch(`https://api.pressminder.org/v1/snapshot/${names.join(',')}?count=10${timestamp ? '&timestamp=' + Math.round(timestamp / 1000) : ''}`)
  .then(response => response.json())
}

async function fetchArticle(url) {
  return fetch(`https://api.pressminder.org/v1/article/${encodeURIComponent(url)}`)
  .then(response => response.json())
}

class App extends Component {
  render() {
    return (
      <Router>
        <div className="App">
          <Route exact path="/" component={Home}/>
          <Route path="/article/:url" component={Article}/>
        </div>
      </Router>
    );
  }
}

class Home extends Component {
  constructor(props) {

    const parsed = queryString.parse(history.location.search);
    let parsedTimestamp = null
    if (parsed.timestamp) {
      parsedTimestamp = parseInt(parsed.timestamp, 10) * 1000
    }

    super(props);
    this.state = {
      snapshot: {},
      playing: false,
      loading: true,
      timestamp: parsedTimestamp || null,
      replayable: !parsedTimestamp
    }
    this.MAX_TIMESTAMP = 3600 * Math.floor(Date.now() / 1000 / 3600)
    this.MIN_TIMESTAMP = this.MAX_TIMESTAMP - 604800
  }

  fetch(timestamp) {
    history.push('?timestamp=' + (timestamp / 1000))
    this.setState({timestamp, loading: true})
    fetchSnapshot(['nyt', 'bbc'], timestamp)
    .then(snapshot => {
      this.setState({snapshot, loading: false})
    })
  }


  componentWillMount() {
    const self = this

    let timestamp = this.state.timestamp || 3600000 * Math.floor(Date.now() / 3600000)
    this.fetch(timestamp)
    this.fetchInterval = setInterval(() => {
      if (self.state.playing) {
        const newTimestamp = self.state.timestamp + 3600000 
        if (newTimestamp < Date.now()) {
          self.fetch(newTimestamp)
        } else {
          self.setState({playing: false, replayable: true})
        }
      }
    }, 1000)
  }

  componentWillUnmount() {
    clearInterval(this.fetchInterval)
    this.setState({playing: false})
  }

  render() {
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
              onClick={() => {
                if (this.state.playing) {
                  this.setState({playing: false})
                } else {
                  this.setState({playing: true})
                  if (this.state.replayable) {
                    this.setState({replayable: false})
                    this.fetch(this.MIN_TIMESTAMP * 1000)
                  }
                }
              }}
            >
              {this.state.playing ? 
                <FontAwesome
                  name='pause'
                />
              : 
                <FontAwesome
                  name='play'
                />
              }
            </button>
            <Slider
              min={this.MIN_TIMESTAMP}
              max={this.MAX_TIMESTAMP}
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
      this.setState({imageLoaded: false})
    }
  }
  render() {
    const RATIO = 3.2
    return (
      <div className="Publication">
        <div className="Publication-screenshot">
          <img
            alt="screenshot"
            src={`https://d1qd36z8dssjk5.cloudfront.net/${this.props.screenshot}`}
            onLoad={() => this.setState({imageLoaded: true})}
          />
          {this.state.selected ?
            <div
              className="Publication-selected"
              style={{
                left: this.state.selected.left / RATIO,
                top: this.state.selected.top / RATIO,
                width: this.state.selected.width / RATIO,
                height: this.state.selected.height / RATIO
              }}
            >
            </div>
          : ''}
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
              <ArticleLink
                key={`${article.url}-${article.since}`}
                onMouseEnter={e => {
                  this.setState({selected: article})
                }}
                onMouseLeave={e => {
                  this.setState({selected: null})
                }}
                { ...article }
              />
            )
          })}
        </FlipMove>
      </div>
    );
  }
}

class ArticleLink extends Component {
  render() {
    return (
      <div
        className="ArticleLink"
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
      >
        <Link 
          to={'/article/' + encodeURIComponent(this.props.url)}
          className="ArticleLink-title"
        >
          {this.props.title}
        </Link>
      </div>
    )
  }
}

class Article extends Component {
  constructor(props) {
    super(props);

    const parsed = queryString.parse(history.location.search);
    
    this.state = {
      version: parsed.version ? parseInt(parsed.version, 10) : null,
      comparedVersion: parsed.compare ? parseInt(parsed.compare, 10) : null,
      loading: true
    }
  }

  componentWillMount() {
    fetchArticle(decodeURIComponent(this.props.match.params.url))
    .then(versions => {
      this.setState({versions, loading: false})
    })
  }

  getArticle(timestamp) {
    if (!this.state.versions) {
      return
    }
    const version = this.state.versions.find(function(v) {
      return parseInt(v.timestamp, 10) === parseInt(timestamp, 10)
    })

    return version || this.state.versions[0]
  }

  renderArticleDiff() {
    const article1 = this.getArticle(this.state.version)
    const article2 = this.getArticle(this.state.comparedVersion)

    const display = document.getElementById('text')
    display.innerHTML = 
    `
    <div class="Article-title">${this.renderTextDiff(article1.title, article2.title)}</div>
    <div class="Article-authors">
    ${
      this.renderTextDiff(
        article1.authors ? article1.authors.join(', '): '',
        article2.authors ? article2.authors.join(', '): ''
      )
    }
    </div>
    <div class="Article-content">${this.renderTextDiff(article1.text, article2.text).replace(/\n/g,'<br/>')}</div>
    `
  }

  renderTextDiff(text1, text2) {
    const diff = jsdiff.diffSentences(text1, text2)
    
    let output = ""
    diff.forEach(function(part){
      let color = part.added ? 'green' : part.removed ? 'red' : 'black';
      output += `<span style="color:${color}">${part.value}</span>`
    });

    return output
  }

  render() {
    if (this.state.loading) {
      return (<div>Loading...</div>)
    }

    setTimeout(this.renderArticleDiff.bind(this), 0)
    return (
      <div className="Article">
        <div className="Article-controls">
          <select
            name="version"
            className="form-control Article-controls-version"
            onChange={e => {
              const newVersion = e.target.value
              history.push(`?version=${newVersion}&compare=${this.state.comparedVersion || ''}`)
              this.setState({version: newVersion})
            }}
          >
            {this.state.versions.map(version => {
              return (
                <option key={"version-" + version.timestamp} value={version.timestamp}>{moment.unix(version.timestamp).format('LLLL')}</option>
              )
            })}
          </select>
          compared to
          <select
            name="compare-version"
            className="form-control Article-controls-version"
            onChange={e => {
              const newVersion = e.target.value
              history.push(`?version=${this.state.version || ''}&compare=${newVersion}`)
              this.setState({comparedVersion: newVersion})
            }}
          >
            {this.state.versions.map(version => {
              return (
                <option key={"compare-" + version.timestamp} value={version.timestamp}>{moment.unix(version.timestamp).format('LLLL')}</option>
              )
            })}
          </select>
        </div>
        <div className="Article-text" id="text">
        </div>
      </div>
    )
  }
}


export default App;
