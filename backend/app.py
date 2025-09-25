from flask import Flask, request, jsonify
import pandas as pd
from flask_cors import CORS # CORS for handling Cross-Origin Resource Sharing
import pickle
import regex as re 
import string
from preprocess import preprocess_text

app = Flask(__name__)

# Enable CORS for all routes, allowing requests from any origin
CORS(app,resources={r"/*":{"origins":"*"}})

with open(r'model_control.pkl', 'rb') as f:
    model_control, weights_control = pickle.load(f)

with open(r'model_alz.pkl', 'rb') as f:
    model_alz, weights_alz = pickle.load(f)


@app.route('/', methods=['GET'])
def get_data():
    data = {
        "message":"API is Running"
    }
    return jsonify(data)

raw_test = "the boy is on a stool that is falling while he's trying to get some cookies out_of the cookie jar in the top shelf (.) of the cupboard .  the little girl is reaching for a cookie .  it looks like she's sort of laughing at the boy or putting her finger up to her mouth to be quiet so her mother doesn't hear who is in the kitchen drying dishes but the water in the sink is overflowing onto the floor and she's stepping in the water .  the window is open .  looks like &+s it's summer outside . [+ gram]  yeah there's trees with leaves .  is that all (.) you want me to do ? [+ exc]  she's [//] (.) doesn't look it's like she hears them .  she doesn't seem to be aware of them .  some of the dishes are already washed and dried .  is that all you want me to say ? [+ exc]"


# Define a route for making predictions
@app.route('/predict', methods=['POST'])
def predict():
    try:
        text = request.get_json()
        features = preprocess_text(text['data'])
        prob_control = model_control.predict_proba(features.multiply(weights_control))
        prob_alz = model_alz.predict_proba(features.multiply(weights_alz))
        print(prob_control, prob_alz)
        prediction = 1 if prob_control[0][1] > prob_alz[0][1] else 0
        return jsonify({'Prediction': prediction,
                        'Confidence': prob_control[0][1]})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=3000)