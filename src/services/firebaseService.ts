import * as firebase from 'firebase-admin';

export class FirebaseService {
	private _app: firebase.app.App;

	constructor() {
		this._app = firebase.initializeApp();
	}

	public app(): firebase.app.App {
		return this._app;
	}
}

export default new FirebaseService();
