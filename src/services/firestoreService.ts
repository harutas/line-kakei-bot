import firebaseService, { type FirebaseService } from './firebaseService';

class FirestoreService {
	private _firestore: FirebaseFirestore.Firestore;

	constructor(readonly firebaseService: FirebaseService) {
		this._firestore = firebaseService.app().firestore();
	}

	public firestore() {
		return this._firestore;
	}

	public async runTransaction<T>(
		transactionalFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>,
	): Promise<T> {
		return this._firestore.runTransaction(transactionalFunction);
	}
}

export default new FirestoreService(firebaseService);
