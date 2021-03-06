const Campground = require('../models/campground');
const { cloudinary } = require('../cloudinary');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding')
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });

module.exports.index = async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', { campgrounds });
}

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new');
}

module.exports.createCampground = async (req, res, next) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send();
    // Throw error if campground (key) object is not included in form data (body)
    // Note key looks like "campground[title]", etc...
    // if (!req.body.campground) throw new ExpressError('Invalid Campground Data', 400);
    const campground = new Campground(req.body.campground);
    // Add lat/lon from geocoding API
    campground.geometry = geoData.body.features[0].geometry;
    // Add path and filename for each image -> req.files is added by multer
    campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.author = req.user._id;
    await campground.save();
    req.flash('success', 'Successfully added a new campground!');
    res.redirect(`/campgrounds/${campground._id}`);
}

module.exports.showCampground = async (req, res) => {
    // Nested populate.
    // For each campground, populate reviews, and for review, populate author,
    // Then populate author for campground
    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!campground) {
        req.flash('error', 'Cannot find that campground!'); // Test by delete and show
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/show', { campground });
}

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    if (!campground) {
        req.flash('error', 'Cannot find that campground!'); // Test by delete and show
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit', { campground });
}

module.exports.updateCampground = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);    // Take objects in array and pass into push
    await campground.save();
    if (req.body.deleteImages) {
        // Remove images from cloudinary
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        // Remove images from DB where filename is in deleteImages array
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
    }
    console.log(campground)
    req.flash('success', 'Campground updated!');
    res.redirect(`/campgrounds/${campground._id}`);
}

module.exports.deleteCampground = async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Campground deleted!');
    res.redirect('/campgrounds');
}