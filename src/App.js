import React, { Component } from 'react';
import './styles.css';

const allLocals = require('./locations.json');
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
      locals: allLocals,
      currentPosition: null,
      geolocalizationPermited: false
    }
  }

  componentWillMount() {
    this.findCoordinates();
  }

  findCoordinates = () => {
    navigator.geolocation.getCurrentPosition(
      position => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        this.setState({
          currentPosition: location,
          geolocalizationPermited: true
        });

        this.addDistanceInLocals();
      },
      error => {
        console.log(error);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  addDistanceInLocals() {
    this.setState(state => {
      const locals = state.locals.map((local, j) => {
        const distance = haversineDistance([this.state.currentPosition.lng, this.state.currentPosition.lat], [local.location.lng, local.location.lat]);
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
      return (
        <div className="local" key={i}>
          <p>{local.name}</p>
          <p><strong>Distância:</strong> { local.distance } km</p>
        </div>
      )
    });
  }

  render() {
    const { locals } = this.state;

    locals.sort(this.orderLocalsByDistance);

    return (
      <div className="app">
        <div className="container">
          <header className="header">
            <h1>Locais de coleta de óleo</h1>
          </header>

          { !this.state.geolocalizationPermited &&
            <div className="alert">
              <h3>Atenção!</h3>
              <p>Permita a localização</p>
            </div>
          }

          { this.state.geolocalizationPermited &&
            <div className="locations">
              { this.renderLocals() }
            </div>
          }
        </div>
      </div>
    )
  }
}
