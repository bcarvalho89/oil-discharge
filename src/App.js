import React, { Component } from 'react';

const myLocal = [-46.8202043, -22.9960313];
const myLocals = require('./locations.json');

const haversineDistance = (latlngA, latlngB, isMiles) => {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371; // km

  const dLat = toRad(latlngB[0] - latlngA[0]);
  const dLatSin = Math.sin(dLat / 2);
  const dLon = toRad(latlngB[1] - latlngA[1]);
  const dLonSin = Math.sin(dLon / 2);

  const a = (dLatSin * dLatSin) +
            (Math.cos(toRad(latlngA[1])) * Math.cos(toRad(latlngB[1])) * dLonSin * dLonSin);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let distance = R * c;

  if (isMiles) distance /= 1.60934;

  return Math.round(distance * 100) / 100;
}


export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      locals: myLocals
    }
  }

  componentDidMount() {
    this.addDistanceInLocals();
  }

  addDistanceInLocals() {
    this.setState(state => {
      const locals = state.locals.map((local, j) => {
        const distance = haversineDistance(myLocal, [local.location.lng, local.location.lat]);
        local.distance = distance;

        return local;
      });

      return {
        locals
      };
    });
  }

  orderLocalsByDistance(a, b) {
    if (a.distance < b.distance) {
      return -1;
    }
    if (a.distance > b.distance) {
      return 1;
    }
    return 0;
  }

  renderLocals = () => {
    return this.state.locals.map((local, i) => {
      return <li key={i}>{local.name} - Distância: { local.distance } km</li>
    });
  }

  render() {
    const { locals } = this.state;

    locals.sort(this.orderLocalsByDistance);

    return (
      <div className="App">
        <h1>Locals</h1>
        <ul>
          { this.renderLocals() }
        </ul>
      </div>
    )
  }
}
