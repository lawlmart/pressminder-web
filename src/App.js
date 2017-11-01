import React, { Component } from 'react';
import './App.css'
import FlipMove from 'react-flip-move'
import {
  BrowserRouter as Router,
  Route  
} from 'react-router-dom'

async function fetchSnapshot(names, timestamp) {
  return fetch(`https://pressminder.org/v1/snapshot/${names.join(',')}?count=8${timestamp ? '&timestamp=' + timestamp : ''}`)
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
      timestamp: null
    }
  }


  componentWillMount() {
    fetchSnapshot(['nyt'], this.state.timestamp)
    .then(snapshot => {
      this.setState({snapshot})
    })
  }

  render() {
    return (
      <div className="Home">
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
    )
  }
}

class Publication extends Component {

  render() {
    return (
      <div className="Publication">
        <div className="Publication-screenshot">
          <img alt="screenshot" src={`https://s3.amazonaws.com/pressminder/${this.props.screenshot}`}/>
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
