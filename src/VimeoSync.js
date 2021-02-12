/* eslint-disable complexity */
import React from 'react'
import PropTypes from 'prop-types'
import { MdSync } from "react-icons/md";
import {IntentLink} from 'part:@sanity/base/router'
import SanityPreview from 'part:@sanity/base/preview'
import Spinner from 'part:@sanity/components/loading/spinner'
import schema from 'part:@sanity/base/schema'
import {Button} from '@sanity/ui'
import {List, Item} from 'part:@sanity/components/lists/default'
import {getPublishedId} from 'part:@sanity/base/util/draft-utils'
import {intersection} from 'lodash'
import {getSubscription} from './sanityConnector'
import {getVideos} from './vimeoConnector'
import styles from './VimeoSync.css'

const schemaTypeNames = schema.getTypeNames()

class VimeoSync extends React.Component {

  state = {
    documents: null,
    loading: true,
    error: null
  }

  static propTypes = {
    title: PropTypes.string,
    types: PropTypes.arrayOf(PropTypes.string),
    query: PropTypes.string,
    queryParams: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    order: PropTypes.string,
    limit: PropTypes.number,
    createButtonText: PropTypes.string,
    accessToken: PropTypes.string,
    folderId: PropTypes.string,
  }

  static defaultProps = {
    title: 'Vimeo videos',
    order: '_updatedAt desc',
    limit: 300,
    types: ['vimeoVideo'],
    query: null,
    queryParams: {},
    createButtonText: null,
    accessToken: null,
    folderId: null
  }

  componentDidMount = () => {
    const {query, limit} = this.props
    const {assembledQuery, params} = this.assembleQuery()
    if (!assembledQuery) {
      return
    }

    this.unsubscribe()
    this.subscription = getSubscription(assembledQuery, params)
      .subscribe({
        next: documents =>
          this.setState({documents: documents.slice(0, limit), loading: false}),
        error: error =>
          this.setState({error, query, loading: false})
      })
  }

  componentWillUnmount() {
    this.unsubscribe()
  }

  unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  assembleQuery = () => {
    const {query, queryParams, types, order, limit} = this.props
    if (query) {
      return {assembledQuery: query, params: queryParams}
    }

    const documentTypes = schemaTypeNames.filter(typeName => {
      const schemaType = schema.get(typeName)
      return schemaType.type && schemaType.type.name === 'document'
    })

    return {
      assembledQuery: `*[_type in $types] | order(${order}) [0...${limit * 2}]`,
      params: {types: types ? intersection(types, documentTypes) : documentTypes}
    }
  }


  render() {
    const {title, types, createButtonText, accessToken, folderId} = this.props
    const {documents, loading, error} = this.state
    const vimeoOptions = {accessToken: accessToken, folderId: folderId}

    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </header>
        <div className={styles.content}>
          {error && <div>{error.message}</div>}
          {!error && loading && <Spinner center message="Loading..." />}
          {(!error && !documents && !loading) && <div>Could not locate any documents :/</div>}
          <List>
            {documents && documents.map(doc => {
              const type = schema.get(doc._type)
              return (
                <Item key={doc._id}>
                  <IntentLink
                    intent="edit"
                    params={{
                      type: doc._type,
                      id: getPublishedId(doc._id)
                    }}
                    className={styles.link}
                  >
                    <SanityPreview layout="default" type={type} value={doc} key={doc._id} />
                  </IntentLink>
                </Item>
              )

            })}
          </List>
        </div>
        {types && types.length === 1 && (
          <div className={styles.footer}>
            <Button
            onClick={getVideos(vimeoOptions)}
            icon={MdSync}
            padding={[3, 3, 4]}
            text={createButtonText || `Sync videos`}
            tone="primary"
            mode="bleed"
            />
          </div>
        )}
      </div>
    )
  }
}

export default VimeoSync