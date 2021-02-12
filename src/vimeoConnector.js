import sanityClient from 'part:@sanity/base/client'
import Axios from "axios";
import speakingurl from 'speakingurl'
import PropTypes from 'prop-types'

const getVideos = (pluginOptions = {}) => {

    const client = Axios.create({
      baseURL: "https://api.vimeo.com",
    });

    const defaultOptions = {
        accessToken: null,
        folderId: null
    }
    let hasVideoFiles = false
    const params = "?fields=uri,modified_time,created_time,name,description,link,pictures,files,width,height,duration&per_page=100"
    const options = { ...defaultOptions, ...pluginOptions }
    const {
        folderId,
        accessToken
    } = options

    const url = folderId ? `/me/projects/${folderId}/videos${params}` : `/me/videos${params}`

    client.get(url,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
          const videos = response.data.data
          const videoFiles = videos && videos.filter(video => video.files)

          hasVideoFiles = videoFiles.length !== 0
          if (!hasVideoFiles) {
              console.info('Can\'t access video files through Vimeo API on this account. Won\'t create "VimeoSrcset" fragment.')
              console.info('Please make sure that you\'re on a Pro plan and that "private" and "video_files" are in the scope of your token.')
          }
          let allVideos = videos.map(video => {
              return {
                  _type: 'vimeoVideo',
                  _id: video.uri.replace('/videos/', ''),
                  slug: {
                      _type: 'slug',
                      current: speakingurl(video.name, {truncate: 200, symbols: true})
                  },
                  modifiedTime: video.modified_time,
                  createdTime: video.created_time,
                  title: video.name,
                  name: video.name,
                  width: video.width,
                  height: video.height,
                  aspectRatio: video.width / video.height,
                  description: video.description ? video.description : '',
                  files: hasVideoFiles ? video.files.map((f, i) => Object.assign(f, {_key: 'file-'+i})) : false,
                  pictures: video.pictures.sizes.map((p, i) => Object.assign(p, {_key: 'picture-'+i})),
                  link: video.link,
                  duration: video.duration
              }
              // createVideo(videoData)
          })
          createVideos(allVideos)
        })
        .catch(function (error) {
          console.log(error);
        });
}

const createVideos = (videos) => {
  let transaction = sanityClient.transaction()

  videos.forEach(video => {
    transaction.createIfNotExists(video).patch(video._id, patch => patch.set(video))
  })

  transaction
  .commit()
  .catch(error => {
    console.error('Sanity error:', error);
    // return {
    //     statusCode: 500,
    //     body: JSON.stringify({
    //         error: 'An internal server error has occurred',
    //     })
    // };
});
}

const createVideo = (video) =>
  sanityClient
  .transaction()
  .createIfNotExists(video)
  .patch(video._id, patch => patch.set(video))
  .commit()
  .catch(error => {
    console.error('Sanity error:', error);
    // return {
    //     statusCode: 500,
    //     body: JSON.stringify({
    //         error: 'An internal server error has occurred',
    //     })
    // };
});

module.exports = {
    getVideos
}
