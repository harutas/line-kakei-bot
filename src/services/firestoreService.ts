import firebaseService, { type FirebaseService } from './firebaseService';

class FirestoreService {
	private _firestore: FirebaseFirestore.Firestore;

	constructor(readonly firebaseService: FirebaseService) {
		this._firestore = firebaseService.app().firestore();
	}

	public firestore() {
		return this._firestore;
	}
}

export default new FirestoreService(firebaseService);
