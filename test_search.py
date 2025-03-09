import requests

def test_video_search():
    try:
        # Test the video search endpoint
        response = requests.get('http://127.0.0.1:5000/search_videos?query=nature')
        print('Status Code:', response.status_code)
        print('Response:', response.text)
        
        # Parse and validate the response
        data = response.json()
        if data.get('success'):
            print('\nSearch successful!')
            videos = data.get('videos', [])
            print(f'Found {len(videos)} videos')
            
            # Display first video details
            if videos:
                first_video = videos[0]
                print('\nFirst Video Details:')
                print('Title:', first_video.get('title'))
                print('Views:', first_video.get('views'))
                print('Duration:', first_video.get('duration'))
        else:
            print('\nSearch failed:', data.get('error'))
            
    except requests.exceptions.RequestException as e:
        print('Network Error:', str(e))
    except Exception as e:
        print('Error:', str(e))

if __name__ == '__main__':
    test_video_search()