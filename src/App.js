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
import createHistory from 'history/createBrowserHistory'
import queryString from 'query-string'
import moment from 'moment'
import Select from 'react-select';
import 'react-rangeslider/lib/index.css'
import 'react-select/dist/react-select.css'
import _ from 'lodash'
const jsdiff = require('diff')
const history = createHistory()

class App extends Component {
  render() {
    return (
      <Router>
        <div className="App">
          <Route exact path="/" component={Home}/>
          <Route exact path="/vis1" component={Vis1}/>
          <Route path="/article/:url" component={Article}/>
        </div>
      </Router>
    );
  }
}

class Post extends Component {
  render() {
    return (
      <div className="Post">
        <div className="Post-header">
          <div className="Post-title">
            {this.props.title}
          </div>
          <div className="Post-date">
            {this.props.date}
          </div>
        </div>
        <div className="Post-content">
          {this.props.content}
        </div>
      </div>
    )
  }
}

class Home extends Component {

  constructor(props) {
    super(props);
    this.state = {
    
    }
  }
  render() {
    return (
      <div className="Home">
        <div className="Home-header">
          <span className="Home-header-logo">PressMinder</span>
        </div>
        <div className="Home-posts">
          <Post 
            date="Nov 2"
            title="Introduction"
            content={(<div>PressMinder is a research project by <a href="mailto:lucas@pressminder.org">Lucas Manfield <i className="fa fa-envelope-o"/></a> analyzing "mainstream media" news coverage. The project comprises a dataset and this blog. The dataset is a time series constructed by periodically scraping the homepages of The New York Times, BBC News, The Washington Post and more to come. Over the next several months I'll be creating a series of interactive visualizations from the data.</div>)}
          />
          <Post
            date="Nov 3"
            title="Dataset"
            content={(<div>If you're wondering where to start, spend some time playing with <Link to="/vis1">the data</Link>.</div>)}
          />
          {/*}
          <Post 
            date="Nov 2"
            title="I. Above the fold"
            content={(<div>
              <p>The first question: what are the top headlines?</p>

              </div>)}
          />
          <Post 
            date="Nov 2"
            title="II. Living Documents"
            content={(<div>

              </div>)}
          />
          <Post 
            date="Nov 2"
            title="III. The News Cycle"
            content={(<div>

              </div>)}
          />
          <Post 
            date="Nov 2"
            title="IV. Beat Reporting"
            content={(<div>

              </div>)}
          />
          <Post 
            date="Nov 2"
            title="V. Bumping Heads"
            content={(<div>

              </div>)}
          />
          */}
        </div>
      </div>
    )
  }
}
class Vis1 extends Component {
  constructor(props) {
    super(props);

    this.MAX_TIMESTAMP = 3600 * Math.floor(Date.now() / 1000 / 3600)
    this.MIN_TIMESTAMP = 1503302400

    const parsed = queryString.parse(history.location.search);
    let parsedTimestamp = null
    if (parsed.timestamp) {
      parsedTimestamp = parseInt(parsed.timestamp, 10) * 1000
    }
    
    this.state = {
      publications: parsed.publications || 'nyt,wapo,bbc',
      snapshot: null,
      preloadedSnapshot: null,
      playing: true,
      loading: true,
      timestamp: parsedTimestamp || (this.MAX_TIMESTAMP - 3600 * 24 * 7) * 1000,
      replayable: !parsedTimestamp
    }

    this.throttledFetch = _.throttle(this.fetch, 500, {leading: true, trailing: true})
  }

  fetch(timestamp, publications) {
    publications = publications || this.state.publications
    history.replace(`/vis1?publications=${publications}&timestamp=${timestamp / 1000}`)
    this.setState({timestamp, publications, loading: true})
    return fetch(`https://api.pressminder.org/v1/snapshot/${publications}?count=100${timestamp ? '&timestamp=' + Math.round(timestamp / 1000) : ''}`)
    .then(response => response.json())
    .then(snapshot => {
      if (!this.state.snapshot || !this.state.playing) {
        this.setState({snapshot, loading: false})
      } else {
        for (const key of Object.keys(snapshot)) {
          this.preloadImage(snapshot[key].screenshot)
        }
        this.setState({preloadedSnapshot: snapshot, loading: false})
      }
    })
  }

  preloadImage(url) {
    const img = new Image()
    img.src= url
  }

  componentWillMount() {
    const self = this
    this.fetch(this.state.timestamp)
    this.fetchInterval = setInterval(() => {
      if (self.state.playing) {
        const newTimestamp = self.state.timestamp + 3600000 
        if (newTimestamp < Date.now()) {
          if (self.state.preloadedSnapshot) {
            self.setState({snapshot: self.state.preloadedSnapshot})
          }
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
      <div className="Vis1">
        <div className="Vis1-header">
          <div className="Header-controls">
            <Select
              className="Header-control-publications"
              name="publications"
              value={this.state.publications}
              simpleValue={true}
              multi={true}
              clearable={false}
              options={[
                { value: 'nyt', label: 'NYT' },
                { value: 'wapo', label: 'WaPo' },
                { value: 'bbc', label: 'BBC' },  
                { value: 'guardian', label: 'Guardian' },
                { value: 'cnn', label: 'CNN' },
              ]}
              onChange={value => {
                this.fetch(this.state.timestamp, value)
              }}
            />
            <Datetime
              className="Header-datetime-control"
              inputProps={{className: "form-control Header-datetime-control-input"}}
              value={new Date(this.state.timestamp)}
              dateFormat="LL"
              onChange={momentObj => {
                if (momentObj.unix) {
                  this.setState({timestamp: momentObj.unix() * 1000, loading: true})
                  this.throttledFetch(momentObj.unix() * 1000)
                }
              }}
            />
            <Slider
              min={this.MIN_TIMESTAMP}
              max={this.MAX_TIMESTAMP}
              step={3600}
              value={this.state.timestamp / 1000}
              orientation="horizontal"
              tooltip={false}
              onChange={value => {
                this.setState({timestamp: value * 1000, loading: true, replayable: value === this.MAX_TIMESTAMP})
                this.throttledFetch(value * 1000)
              }}
            />
            <button
              className="Header-button-control"
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
                <i
                  className='fa fa-pause'
                />
              : 
                <i
                  className='fa fa-play'
                />
              }
            </button>
          </div>
        </div>
        {this.state.snapshot ?
        <div className="Vis1-content">
          {Object.keys(this.state.snapshot).map(id => {
            return (
              <Publication
                key={id}
                articles={this.state.snapshot[id].articles}
                screenshot={this.state.snapshot[id].screenshot}
                loading={false}
              />
            )
          })}
        </div>
        : ''}
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
          {this.props.articles.map(article => {
            return (
              <Link
                to={'/article/' + encodeURIComponent(article.url)}
                className={`Publication-screenshot-overlay ${this.state.selected === article ? 'selected' : ''}`}
                style={{
                  left: article.left / RATIO,
                  top: article.top / RATIO,
                  width: article.width / RATIO,
                  height: article.height / RATIO
                }}
                onMouseEnter={(e) => {
                  this.setState({selected: article})
                }}
                onMouseLeave={(e) => {
                  this.setState({selected: null})
                }}
              />
              )
          })}
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
          {this.props.articles.slice(0,25).map(article => {
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
    const url = decodeURIComponent(this.props.match.params.url)
    return fetch(`https://api.pressminder.org/v1/article/${encodeURIComponent(url)}`)
    .then(response => response.json())
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
    const article2 = this.getArticle(this.state.version)
    const article1 = this.getArticle(this.state.comparedVersion)

    const display = document.getElementById('text')
    display.innerHTML = 
    `
    <div class="Article-title">${this.renderTextDiff(article1.title, article2.title)}</div>
    <div class="Article-subhead">
      <span class="Article-authors">
      ${article1.authors.length || article2.authors.length ? 'By ' : ''} 
      ${
        this.renderTextDiff(
          article1.authors ? article1.authors.join(', '): '',
          article2.authors ? article2.authors.join(', '): ''
        )
      }
      </span>
      <span class="Article-published">
      ${article1.published ? moment.unix(article1.published).format('LLL') : ''}
      </span>
      <a href="${article1.url}" class="Article-link" target="_blank">
        <i class="fa fa-external-link" style="position: relative; left: -2px; top: 1px;"></i> View original
      </a>
    </div>
    <div class="Article-content">
      <p>
        ${this.renderTextDiff(article1.text, article2.text).replace(/\n/g,'</p></p>')}
      </p>   
    </div>
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
      return (<div className="Article-loading"><div className="loader"></div></div>)
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
              history.replace(`?version=${newVersion}&compare=${this.state.comparedVersion || ''}`)
              this.setState({version: newVersion})
            }}
          >
            {this.state.versions.map(version => {
              return (
                <option key={"version-" + version.timestamp} value={version.timestamp}>{moment.unix(version.timestamp).format('LLL')}</option>
              )
            })}
          </select>
          compared to
          <select
            name="compare-version"
            className="form-control Article-controls-version"
            onChange={e => {
              const newVersion = e.target.value
              history.replace(`?version=${this.state.version || ''}&compare=${newVersion}`)
              this.setState({comparedVersion: newVersion})
            }}
          >
            {this.state.versions.map(version => {
              return (
                <option key={"compare-" + version.timestamp} value={version.timestamp}>{moment.unix(version.timestamp).format('LLL')}</option>
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
